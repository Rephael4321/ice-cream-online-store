// components/cms/entities/client/list.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import { apiDelete, apiGet } from "@/lib/api/client";

type Client = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/api/clients", { cache: "no-store" });
      const data = await res.json();

      const normalized: Client[] = (data.clients || data).map((c: any) => {
        const date = new Date(c.createdAt || c.created_at);
        return {
          id: c.id,
          name: c.name || "",
          phone: c.phone || "—",
          address: c.address || "",
          createdAt: !isNaN(date.getTime())
            ? date.toLocaleString("he-IL")
            : c.createdAt || c.created_at,
        };
      });

      setClients(normalized);
    } catch {
      showToast("❌ שגיאה בטעינת לקוחות", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCopy = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      showToast("📋 מספר הועתק", "success");
    } catch {
      showToast("❌ לא הצלחנו להעתיק", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("האם למחוק את הלקוח וכל ההזמנות?")) return;

    try {
      const res = await apiDelete(`/api/clients/${id}`);
      if (!res.ok) throw new Error();
      setClients((prev) => prev.filter((c) => c.id !== id));
      showToast("🗑️ לקוח נמחק", "success");
    } catch {
      showToast("❌ תקלה במחיקה", "error");
    }
  };

  return (
    <main
      dir="rtl"
      className="px-4 sm:px-6 md:px-10 max-w-7xl mx-auto relative"
    >
      {/* Shared header title for the section layout */}
      <HeaderHydrator title="לקוחות" />

      <div className="py-6 space-y-6">
        {loading ? (
          <p>טוען לקוחות...</p>
        ) : clients.length === 0 ? (
          <p>אין לקוחות להצגה.</p>
        ) : (
          <ul className="space-y-4">
            {clients.map((client) => (
              <li
                key={client.id}
                className="border rounded p-4 shadow flex justify-between items-center"
              >
                <div className="space-y-1">
                  <p>שם: {client.name}</p>
                  <p>כתובת: {client.address || "—"}</p>
                  <p>
                    טלפון:{" "}
                    <span
                      className="underline text-blue-600 cursor-pointer"
                      onClick={() => handleCopy(client.phone)}
                      title="העתק מספר"
                    >
                      {client.phone}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">{client.createdAt}</p>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <Link
                    href={`/clients/${client.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                  >
                    צפייה
                  </Link>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(client.id)}
                  >
                    מחק
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
