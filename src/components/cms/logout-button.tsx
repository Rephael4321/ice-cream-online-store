"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api/client";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function onLogout() {
    await apiPost("/api/auth/logout");
    router.replace("/");
    router.refresh();
  }

  return (
    <Link
      href="/"
      onClick={(e) => {
        e.preventDefault();
        void onLogout();
      }}
      className={className}
    >
      התנתקות
    </Link>
  );
}
