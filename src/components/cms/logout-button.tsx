"use client";

import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api/client";

export default function LogoutButton() {
  const router = useRouter();

  async function onLogout() {
    await apiPost("/api/auth/logout");
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      className="text-xl text-gray-700 hover:text-purple-700 transition hover:underline"
    >
      התנתקות
    </button>
  );
}
