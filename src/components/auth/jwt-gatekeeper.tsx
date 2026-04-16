// components/auth/jwt-gatekeeper.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiGet } from "@/lib/api/client";
import { isAdminEquivalentRole } from "@/lib/auth/roles";
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
function isAdminEquivalent(p?: SessionUser | null) {
  return isAdminEquivalentRole(p?.role);
}

// CMS paths a driver may visit: /cms (menu hub), /orders, …, /notifications, /clients/[id]/payment
function isDriverAllowedCmsPath(pathname: string) {
  return (
    pathname === "/cms" ||
    /^\/orders(\/(client\/[^/]+\/unpaid|\d+))?$/.test(pathname) ||
    /^\/clients\/\d+\/payment$/.test(pathname) ||
    pathname === "/notifications"
  );
}

const CMS_REJECTED_PATH = "/cms-unauthorized";

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
        router.replace(CMS_REJECTED_PATH);
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

      if (!isAdminEquivalent(payload)) {
        router.replace(CMS_REJECTED_PATH);
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
