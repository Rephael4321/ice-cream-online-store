"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";

type OrderRow = {
  orderId: number;
  clientName: string | null;
  createdAt: string;
  total: number;
};

type ClientDebt = {
  unpaidTotal: number;
  manualDebtAdjustment: number | null;
  name?: string | null;
};

export default function ClientUnpaidOrders({ clientId }: { clientId: number }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [clientDebt, setClientDebt] = useState<ClientDebt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordersRes, clientRes] = await Promise.all([
          apiGet(`/api/orders?clientId=${clientId}&unpaid=1`, {
            cache: "no-store",
          }),
          apiGet(`/api/clients/${clientId}`, { cache: "no-store" }),
        ]);

        if (!ordersRes.ok) {
          const data = await ordersRes.json().catch(() => ({}));
          throw new Error(data?.error ?? "שגיאה בטעינה");
        }
        const ordersData = await ordersRes.json();
        if (!cancelled) {
          setOrders(ordersData.orders ?? []);
        }

        if (!cancelled && clientRes.ok) {
          const clientData = await clientRes.json();
          setClientDebt({
            unpaidTotal:
              clientData.unpaidTotal != null
                ? Number(clientData.unpaidTotal)
                : 0,
            manualDebtAdjustment:
              clientData.manualDebtAdjustment != null
                ? Number(clientData.manualDebtAdjustment)
                : null,
            name: clientData.name ?? null,
          });
        } else if (!cancelled) {
          setClientDebt(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "שגיאה בטעינה");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const clientName = orders[0]?.clientName ?? clientDebt?.name ?? null;
  const hasUnpaidOrders = orders.length > 0;
  const adjustment = clientDebt?.manualDebtAdjustment ?? null;
  const hasAdjustment = adjustment != null && adjustment !== 0;
  const showTotalDebt = clientDebt != null && (hasUnpaidOrders || hasAdjustment);

  if (loading) {
    return (
      <div className="p-4" dir="rtl">
        <p>טוען...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4" dir="rtl">
        <p className="text-red-600">{error}</p>
        <Link href="/orders" className="text-blue-600 underline mt-2 inline-block">
          חזרה להזמנות
        </Link>
      </div>
    );
  }

  if (!hasUnpaidOrders && !hasAdjustment) {
    return (
      <div className="p-4" dir="rtl">
        <h1 className="text-xl font-bold mb-2">הזמנות לא שולמו</h1>
        <p>אין הזמנות לא שולמות ללקוח זה.</p>
        <Link href="/orders" className="text-blue-600 underline mt-2 inline-block">
          חזרה להזמנות
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4" dir="rtl">
      <h1 className="text-xl font-bold mb-2">
        הזמנות לא שולמו – {clientName ?? `לקוח #${clientId}`}
      </h1>
      <ul className="space-y-2">
        {orders.map((o) => {
          const date = new Date(o.createdAt);
          const formatted = !isNaN(date.getTime())
            ? date.toLocaleString("he-IL")
            : o.createdAt;
          return (
            <li
              key={o.orderId}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b pb-2"
            >
              <Link
                href={`/orders/${o.orderId}`}
                className="font-medium text-blue-600 hover:underline"
              >
                הזמנה #{o.orderId}
              </Link>
              <span className="text-gray-600">{formatted}</span>
              <span>סה״כ: ₪{Number(o.total).toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
      {hasAdjustment && (
        <p className="mt-2 text-amber-700 font-medium">
          התאמה ידנית: ₪{Number(adjustment).toFixed(2)}
        </p>
      )}
      {showTotalDebt && (
        <p className="mt-1 font-semibold text-amber-800">
          סה״כ חוב: ₪{Number(clientDebt.unpaidTotal).toFixed(2)}
        </p>
      )}
      <Link href="/orders" className="text-blue-600 underline mt-4 inline-block">
        חזרה להזמנות
      </Link>
    </div>
  );
}
