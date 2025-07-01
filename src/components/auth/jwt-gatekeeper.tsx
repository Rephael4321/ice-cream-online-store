"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";

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

    // Token from URL
    if (urlToken) {
      try {
        jwtDecode(urlToken);
        Cookies.set("token", urlToken, {
          path: "/",
          expires: 1 / 6,
        });

        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("token");
        router.replace(cleanUrl.toString());

        setAuthorized(true);
      } catch {
        router.replace("/store");
      }
      return;
    }

    // Token from cookie
    if (cookieToken) {
      try {
        jwtDecode(cookieToken);
        setAuthorized(true);
      } catch {
        Cookies.remove("token");
        router.replace("/");
      }
    } else {
      router.replace("/");
    }
  }, [searchParams, router]);

  if (!authorized) return null;

  return <>{children}</>;
}
