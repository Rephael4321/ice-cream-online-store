"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AddressSearch, type SelectedPlace } from "@/components/AddressSearch";
import { showToast } from "@/components/cms/ui/toast";
import { Button } from "@/components/cms/ui/button";
import { apiGet, apiPatch } from "@/lib/api/client";

type Client = {
  id: number;
  name: string;
  phone: string;
  address: string | null;
};

type OrderAddressFormProps = {
  orderId: string;
};

export default function OrderAddressForm({ orderId }: OrderAddressFormProps) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const orderRes = await apiGet(`/api/orders/${orderId}`, {
          cache: "no-store",
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok || !orderData.order) {
          showToast("הזמנה לא נמצאה", "error");
          router.push("/orders");
          return;
        }
        const clientId = orderData.order.clientId;
        if (!clientId) {
          showToast("ללא לקוח משויך להזמנה", "error");
          router.push(`/orders/${orderId}`);
          return;
        }
        const clientRes = await apiGet(`/api/clients/${clientId}`, {
          cache: "no-store",
        });
        const clientData = await clientRes.json();
        if (!clientRes.ok || !clientData.id) {
          showToast("שגיאה בטעינת פרטי לקוח", "error");
          if (!cancelled) router.push(`/orders/${orderId}`);
          return;
        }
        if (!cancelled) {
          setClient({
            id: clientData.id,
            name: clientData.name ?? "",
            phone: clientData.phone ?? "",
            address: clientData.address ?? null,
          });
        }
      } catch {
        if (!cancelled) showToast("שגיאה בטעינה", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, router]);

  const handleSave = async () => {
    if (!client || !selectedPlace) return;
    setSaving(true);
    try {
      const res = await apiPatch(`/api/clients/${client.id}/address`, {
        address: selectedPlace.formattedAddress,
        address_lat: selectedPlace.lat,
        address_lng: selectedPlace.lng,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "שגיאה בשמירה");
      }
      showToast("הכתובת נשמרה בהצלחה", "success");
      router.push(`/orders/${orderId}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה בשמירה", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main dir="rtl" className="px-4 py-8 max-w-md mx-auto">
        <p className="text-gray-600">טוען...</p>
      </main>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <main
      dir="rtl"
      className="px-4 py-8 max-w-md mx-auto"
      style={{ background: "var(--waze-bg, #fff)" }}
    >
      <Link
        href={`/orders/${orderId}`}
        className="text-blue-600 hover:underline block mb-6"
      >
        ← חזרה להזמנה
      </Link>
      <h1
        className="text-xl font-bold mb-6"
        style={{ color: "var(--waze-text, #111)" }}
      >
        עדכון כתובת לניווט (Waze)
      </h1>
      <div className="space-y-4">
        <AddressSearch
          showWazeButton={false}
          onPlaceSelect={setSelectedPlace}
        />
        {selectedPlace && (
          <div className="flex flex-col gap-2">
            <p
              className="text-sm"
              style={{ color: "var(--waze-text-muted,#6b7280)" }}
            >
              {selectedPlace.formattedAddress}
            </p>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3"
              style={{
                background: "var(--waze-primary,#3b82f6)",
              }}
            >
              {saving ? "שומר..." : "שמור כתובת"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
