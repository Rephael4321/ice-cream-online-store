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

export default function ClientUnpaidOrders({ clientId }: { clientId: number }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet(
          `/api/orders?clientId=${clientId}&unpaid=1`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? "שגיאה בטעינה");
        }
        const data = await res.json();
        if (!cancelled) {
          setOrders(data.orders ?? []);
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

  const clientName = orders[0]?.clientName ?? null;

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

  if (orders.length === 0) {
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
      <Link href="/orders" className="text-blue-600 underline mt-4 inline-block">
        חזרה להזמנות
      </Link>
    </div>
  );
}
