// components/cms/entities/client/details.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input, Label, Button, showToast } from "@/components/cms/ui";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import { useAuth } from "@/components/auth/auth-context";
import { apiDelete, apiGet, apiPatch, apiPut } from "@/lib/api/client";

type Client = {
  id: number;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
  unpaidTotal?: number;
  unpaidCount?: number;
  manualDebtAdjustment?: number | null;
};

export default function ClientDetails() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const id = String(params.id ?? "");

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDebt, setEditingDebt] = useState(false);
  const [debtInput, setDebtInput] = useState("");
  const [savingDebt, setSavingDebt] = useState(false);

  // Load client
  useEffect(() => {
    let alive = true;
    async function fetchClient() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet(`/api/clients/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch client");
        const data = await res.json();

        const {
          id: clientId,
          name = "",
          phone = "",
          address = "",
          created_at,
          createdAt,
          unpaidTotal,
          unpaidCount,
          manualDebtAdjustment,
        } = data || {};

        const created =
          createdAt || created_at ? new Date(createdAt || created_at) : null;

        if (alive) {
          setClient({
            id: clientId,
            name: name ?? "",
            phone: phone ?? "",
            address: address ?? "",
            createdAt:
              created && !isNaN(created.getTime())
                ? created.toLocaleString("he-IL")
                : "-",
            unpaidTotal: unpaidTotal != null ? Number(unpaidTotal) : 0,
            unpaidCount: unpaidCount != null ? Number(unpaidCount) : 0,
            manualDebtAdjustment:
              manualDebtAdjustment != null ? Number(manualDebtAdjustment) : null,
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
      const res = await apiPut(`/api/clients/${client.id}`, {
        name,
        phone,
        address,
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
      const res = await apiDelete(`/api/clients/${client.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      showToast("🗑️ נמחק בהצלחה", "success");
      router.push("/clients");
    } catch {
      showToast("❌ שגיאה במחיקה", "error");
    }
  };

  const showDebtBlock =
    client?.unpaidTotal != null &&
    (client.unpaidTotal > 0 || (client.manualDebtAdjustment ?? 0) !== 0);

  const handleStartEditDebt = () => {
    if (!client) return;
    setDebtInput(String(client.unpaidTotal ?? 0));
    setEditingDebt(true);
  };

  const handleCancelEditDebt = () => {
    setEditingDebt(false);
    setDebtInput("");
  };

  const handleSaveDebt = async () => {
    if (!client) return;
    const target = Number(debtInput);
    if (!Number.isFinite(target) || target < 0) {
      showToast("נא להזין סכום תקין (מספר אי-שלילי)", "warning");
      return;
    }
    setSavingDebt(true);
    try {
      const res = await apiPatch(`/api/clients/${client.id}/debt-adjustment`, {
        targetTotalDebt: target,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      showToast("✅ סה״כ חוב עודכן", "success");
      setEditingDebt(false);
      setDebtInput("");
      const refetch = await apiGet(`/api/clients/${client.id}`, {
        cache: "no-store",
      });
      if (refetch.ok) {
        const refetchData = await refetch.json();
        setClient((prev) =>
          prev
            ? {
                ...prev,
                unpaidTotal:
                  refetchData.unpaidTotal != null
                    ? Number(refetchData.unpaidTotal)
                    : prev.unpaidTotal,
                manualDebtAdjustment:
                  refetchData.manualDebtAdjustment != null
                    ? Number(refetchData.manualDebtAdjustment)
                    : refetchData.manualDebtAdjustment ?? null,
              }
            : prev
        );
      }
      router.refresh();
    } catch {
      showToast("❌ שגיאה בעדכון סה״כ חוב", "error");
    } finally {
      setSavingDebt(false);
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
                value={client.name ?? ""}
                onChange={handleChange}
                dir="auto"
              />
            </div>

            <div>
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                name="phone"
                value={client.phone ?? ""}
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
                value={client.address ?? ""}
                onChange={handleChange}
                dir="auto"
              />
            </div>

            <p className="text-sm text-gray-500">
              נוצר בתאריך: {client.createdAt}
            </p>

            {showDebtBlock && (
              <div className="border rounded p-3 bg-amber-50 border-amber-200">
                {!editingDebt ? (
                  <>
                    <p className="font-semibold text-amber-800 flex items-center gap-2 flex-wrap">
                      סה״כ חוב: ₪{Number(client.unpaidTotal).toFixed(2)}
                      {role === "admin" && (
                        <button
                          type="button"
                          onClick={handleStartEditDebt}
                          className="text-sm px-2 py-1 rounded border border-amber-400 text-amber-800 hover:bg-amber-100"
                          title="ערוך סה״כ חוב"
                        >
                          ערוך
                        </button>
                      )}
                    </p>
                    {client.unpaidCount != null && client.unpaidCount > 0 && (
                      <p className="text-sm text-amber-700">
                        מספר הזמנות לא שולמו: {client.unpaidCount}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="debt-total">סה״כ חוב חדש (₪)</Label>
                    <Input
                      id="debt-total"
                      type="number"
                      min={0}
                      step={0.01}
                      value={debtInput}
                      onChange={(e) => setDebtInput(e.target.value)}
                      dir="ltr"
                      className="max-w-[140px]"
                    />
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={handleSaveDebt}
                        disabled={savingDebt}
                      >
                        {savingDebt ? "שומר..." : "שמור"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditDebt}
                        disabled={savingDebt}
                      >
                        ביטול
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
