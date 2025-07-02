// components/auth/jwt-wrapper.tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const JwtGatekeeper = dynamic(() => import("./jwt-gatekeeper"), {
  ssr: false,
});

export default function JwtWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>בודק גישה...</div>}>
      <JwtGatekeeper>{children}</JwtGatekeeper>
    </Suspense>
  );
}
