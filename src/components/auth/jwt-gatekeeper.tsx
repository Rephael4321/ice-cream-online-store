// components/auth/jwt-gatekeeper.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Cookies from "js-cookie";

type ExtraJwt = {
  role?: string;
  roles?: string[];
  id?: string;
  name?: string;
  exp?: number;
  iat?: number;
};

// Server-side JWT verification via API
async function verifyJWTClient(token: string): Promise<ExtraJwt | null> {
  try {
    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.payload || null;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}

function isExpired(payload: ExtraJwt | null): boolean {
  if (!payload) return true;
  if (typeof payload.exp === "number") {
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSec;
  }
  return false;
}

function hasRole(p: ExtraJwt | undefined, name: string) {
  if (!p) return false;
  if (p.role === name) return true;
  return Array.isArray(p.roles) && p.roles.includes(name);
}

function isDriver(p?: ExtraJwt) {
  return hasRole(p, "driver");
}
function isAdmin(p?: ExtraJwt) {
  return hasRole(p, "admin");
}

// CMS paths a driver may visit:
function isDriverAllowedCmsPath(pathname: string) {
  return /^\/orders(\/[^/]+)?$/.test(pathname); // /orders or /orders/[id]
}

export default function JwtGatekeeper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function verifyAndAuthorize() {
      // 1) Accept ?token= for first-time deep links into CMS
      const urlToken = searchParams.get("token");
      if (urlToken) {
        // Verify the URL token
        const payload = await verifyJWTClient(urlToken);
        if (!payload || isExpired(payload)) {
          Cookies.remove("token", { path: "/" });
          router.replace("/");
          return;
        }
        // Persist cookie then strip ?token=
        const isHttps =
          typeof window !== "undefined" && window.location.protocol === "https:";
        Cookies.set("token", urlToken, {
          path: "/",
          expires: 14,
          sameSite: "lax",
          secure: isHttps,
        });
        const clean = new URL(window.location.href);
        clean.searchParams.delete("token");
        router.replace(clean.toString());
        return; // wait for next render with clean URL
      }

      // 2) Use cookie token for all CMS auth
      const token = Cookies.get("token");

      // No cookie → Only store pages should be accessible (but this wrapper runs in CMS),
      // so bounce CMS visitors without a token back to /store.
      if (!token) {
        router.replace("/");
        return;
      }

      // Verify the token with signature checking
      const payload = await verifyJWTClient(token);
      if (!payload || isExpired(payload)) {
        Cookies.remove("token", { path: "/" });
        router.replace("/");
        return;
      }

      // 3) Role-based CMS gating
      if (isDriver(payload)) {
        // Driver may ONLY access /orders and /orders/[id]
        if (!isDriverAllowedCmsPath(pathname)) {
          router.replace("/orders");
          return;
        }
        setAuthorized(true);
        return;
      }

      // Admin (or any non-driver) → full CMS access
      // If you want to restrict unknown roles, replace this with a redirect.
      setAuthorized(true);
    }

    verifyAndAuthorize();
  }, [searchParams, pathname, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
