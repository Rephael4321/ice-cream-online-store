"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { jwtDecode, JwtPayload } from "jwt-decode";
import Cookies from "js-cookie";

function isJwtValid(token: string): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    // jwtDecode doesn't verify signature, but we can still enforce exp
    if (typeof exp === "number") {
      const nowSec = Math.floor(Date.now() / 1000);
      if (exp <= nowSec) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default function JwtGatekeeper({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const cookieToken = Cookies.get("token");

    // If token arrives via URL, validate then persist as a 14-day cookie
    if (urlToken) {
      if (isJwtValid(urlToken)) {
        const isHttps =
          typeof window !== "undefined" &&
          window.location.protocol === "https:";
        Cookies.set("token", urlToken, {
          path: "/",
          // Persist (14 days). This controls browser persistence (separate from JWT exp).
          expires: 14,
          sameSite: "lax",
          secure: isHttps, // true on HTTPS; okay if false on localhost
        });

        // Clean the URL
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("token");
        router.replace(cleanUrl.toString());

        setAuthorized(true);
      } else {
        // Invalid/expired token in URL → go to store
        router.replace("/store");
      }
      return;
    }

    // No URL token; fall back to cookie
    if (cookieToken && isJwtValid(cookieToken)) {
      setAuthorized(true);
    } else {
      // Remove bad/expired cookie and bounce
      Cookies.remove("token", { path: "/" });
      router.replace("/");
    }
  }, [searchParams, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
