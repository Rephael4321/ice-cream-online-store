// components/auth/jwt-gatekeeper.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { jwtDecode, type JwtPayload } from "jwt-decode";
import Cookies from "js-cookie";

type ExtraJwt = JwtPayload & { role?: string; roles?: string[] };

function isExpired(token: string): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    if (typeof exp === "number") {
      const nowSec = Math.floor(Date.now() / 1000);
      return exp <= nowSec;
    }
  } catch {
    return true;
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
    // 1) Accept ?token= for first-time deep links into CMS
    const urlToken = searchParams.get("token");
    if (urlToken) {
      // If URL token is expired/invalid → treat as unauth’d
      if (isExpired(urlToken)) {
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

    // Bad/expired cookie → purge + to /store
    if (isExpired(token)) {
      Cookies.remove("token", { path: "/" });
      router.replace("/");
      return;
    }

    // 3) Role-based CMS gating
    let payload: ExtraJwt | undefined;
    try {
      payload = jwtDecode<ExtraJwt>(token);
    } catch {
      Cookies.remove("token", { path: "/" });
      router.replace("/");
      return;
    }

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
  }, [searchParams, pathname, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
