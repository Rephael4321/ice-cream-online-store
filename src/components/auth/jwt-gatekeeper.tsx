// components/auth/jwt-gatekeeper.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiGet } from "@/lib/api/client";
import { AuthContext } from "./auth-context";

type SessionUser = {
  id: number;
  role: string;
};

async function getCurrentSession(): Promise<SessionUser | null> {
  try {
    const response = await apiGet("/api/auth/session", { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.authenticated ? data.user ?? null : null;
  } catch (err) {
    console.error("Session lookup failed:", err);
    return null;
  }
}

function hasRole(p: SessionUser | undefined | null, name: string) {
  if (!p) return false;
  if (p.role === name) return true;
  return false;
}

function isDriver(p?: SessionUser | null) {
  return hasRole(p, "driver");
}
function isAdmin(p?: SessionUser | null) {
  return hasRole(p, "admin");
}

// CMS paths a driver may visit: /orders, /orders/[id], /orders/client/[clientId]/unpaid, /clients/[id]/payment
function isDriverAllowedCmsPath(pathname: string) {
  return (
    /^\/orders(\/(client\/[^/]+\/unpaid|\d+))?$/.test(pathname) ||
    /^\/clients\/\d+\/payment$/.test(pathname)
  );
}

export default function JwtGatekeeper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function verifyAndAuthorize() {
      const payload = await getCurrentSession();
      if (!payload) {
        router.replace("/");
        return;
      }

      const roleValue = payload.role ?? null;
      if (isDriver(payload)) {
        if (!isDriverAllowedCmsPath(pathname)) {
          router.replace("/orders");
          return;
        }
        setRole(roleValue);
        setAuthorized(true);
        return;
      }

      if (!isAdmin(payload)) {
        router.replace("/");
        return;
      }

      setRole(roleValue);
      setAuthorized(true);
    }

    verifyAndAuthorize();
  }, [pathname, router]);

  if (!authorized) return null;
  return (
    <AuthContext.Provider value={{ role }}>
      {children}
    </AuthContext.Provider>
  );
}
