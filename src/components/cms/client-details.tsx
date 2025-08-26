// components/cms/entities/client/details.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import { Label } from "@/components/cms/ui/label";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";

type Client = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
};

export default function ClientDetails() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load client
  useEffect(() => {
    let alive = true;
    async function fetchClient() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/clients/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch client");
        const data = await res.json();

        const {
          id: clientId,
          name = "",
          phone = "",
          address = "",
          created_at,
          createdAt,
        } = data || {};

        const created =
          createdAt || created_at ? new Date(createdAt || created_at) : null;

        if (alive) {
          setClient({
            id: clientId,
            name,
            phone,
            address,
            createdAt:
              created && !isNaN(created.getTime())
                ? created.toLocaleString("he-IL")
                : "-",
          });
        }
      } catch {
        if (alive) setError("תקלה בטעינת לקוח");
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (id) fetchClient();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!client) return;
    const { name, value } = e.target;
    setClient({ ...client, [name]: value });
  };

  const handleSave = async () => {
    if (!client) return;

    const { name, phone, address } = client;
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showToast("אנא מלא את כל השדות", "warning");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");

      showToast("✅ נשמר בהצלחה", "success");
      router.refresh(); // keep list pages in sync if navigated back
    } catch {
      showToast("❌ שגיאה בשמירה", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    if (!confirm("האם למחוק את הלקוח וכל ההזמנות?")) return;

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      showToast("🗑️ נמחק בהצלחה", "success");
      router.push("/clients");
    } catch {
      showToast("❌ שגיאה במחיקה", "error");
    }
  };

  return (
    <main
      dir="rtl"
      className="px-4 sm:px-6 md:px-10 max-w-3xl mx-auto relative"
    >
      <HeaderHydrator title="עריכת לקוח" />

      <div className="py-6 space-y-6">
        {loading ? (
          <p>טוען...</p>
        ) : error || !client ? (
          <p>שגיאה בטעינה</p>
        ) : (
          <div className="space-y-5">
            <div>
              <Label htmlFor="name">שם</Label>
              <Input
                id="name"
                name="name"
                value={client.name}
                onChange={handleChange}
                dir="auto"
              />
            </div>

            <div>
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                name="phone"
                value={client.phone}
                onChange={handleChange}
                inputMode="tel"
                dir="ltr"
              />
            </div>

            <div>
              <Label htmlFor="address">כתובת</Label>
              <Input
                id="address"
                name="address"
                value={client.address}
                onChange={handleChange}
                dir="auto"
              />
            </div>

            <p className="text-sm text-gray-500">
              נוצר בתאריך: {client.createdAt}
            </p>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "שומר..." : "שמור"}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                מחק לקוח
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
