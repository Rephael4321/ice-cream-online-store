"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";
import { Button } from "@/components/cms/ui/button";

type Order = {
  orderId: number;
  createdAt: string;
  itemCount: number;
  isPaid: boolean;
  isReady: boolean;
  isTest?: boolean;
  clientName: string | null;
  clientAddress: string | null;
  clientPhone: string | null;
};

const SCROLL_KEY = "lastViewedOrder";

export default function ListOrder() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLUListElement>(null);

  const getCurrentWeekRange = () => {
    const now = new Date();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const format = (d: Date) => d.toISOString().split("T")[0];

    return {
      from: format(sunday),
      to: format(saturday),
    };
  };

  const fetchOrders = async (from?: string, to?: string) => {
    setLoading(true);
    let query = "";
    if (from && to) query = `?from=${from}&to=${to}`;
    const res = await fetch(`/api/orders${query}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => {
    const { from, to } = getCurrentWeekRange();
    fetchOrders(from, to);
  }, []);

  useEffect(() => {
    if (selectedDate === null) {
      const { from, to } = getCurrentWeekRange();
      fetchOrders(from, to);
    } else {
      const dateStr = selectedDate.toLocaleDateString("sv-SE");
      fetchOrders(dateStr, dateStr);
    }
  }, [selectedDate]);

  useEffect(() => {
    const raw = localStorage.getItem(SCROLL_KEY);
    if (!raw) return;

    try {
      const { orderId, timestamp } = JSON.parse(raw);
      const now = Date.now();
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      if (now - timestamp > FOUR_HOURS) {
        localStorage.removeItem(SCROLL_KEY);
        return;
      }

      const el = document.querySelector(`[data-order-id="${orderId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        localStorage.removeItem(SCROLL_KEY);
      }
    } catch {
      localStorage.removeItem(SCROLL_KEY);
    }
  }, [orders]);

  const handleDelete = async (orderId: number) => {
    if (!confirm("האם למחוק את ההזמנה?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("🗑️ ההזמנה נמחקה");
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    } catch {
      toast.error("❌ תקלה במחיקה");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📦 הזמנות</h1>

      <div className="mb-6 flex items-center gap-4">
        <label className="font-semibold">סנן לפי תאריך:</label>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          placeholderText="בחר תאריך"
          dateFormat="dd/MM/yyyy"
          className="border px-3 py-2 rounded"
          isClearable
        />
      </div>

      {loading ? (
        <p>טוען הזמנות...</p>
      ) : orders.length === 0 ? (
        <p>אין הזמנות לתאריך זה.</p>
      ) : (
        <ul className="space-y-4" ref={containerRef}>
          {orders.map((order) => {
            const date = new Date(order.createdAt);
            const formatted = !isNaN(date.getTime())
              ? date.toLocaleString("he-IL")
              : order.createdAt;

            const testStyle = order.isTest
              ? "bg-yellow-100 border-yellow-400"
              : "";

            return (
              <li
                key={order.orderId}
                data-order-id={order.orderId}
                className={`border rounded p-4 shadow flex justify-between items-center ${testStyle}`}
              >
                <div>
                  <p className="font-bold">
                    הזמנה #{order.orderId}{" "}
                    {order.isTest && (
                      <span className="text-yellow-700 text-sm">🧪 בדיקה</span>
                    )}
                  </p>
                  <p>לקוח: {order.clientName}</p>
                  <p>כתובת: {order.clientAddress}</p>
                  <p>טלפון: {order.clientPhone || "—"}</p>
                  <p>תאריך: {formatted}</p>
                  <p>כמות מוצרים: {order.itemCount}</p>
                  <p>שולם: {order.isPaid ? "✔️" : "❌"}</p>
                  <p>מוכן: {order.isReady ? "✔️" : "❌"}</p>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <Link
                    href={`/orders/${order.orderId}`}
                    onClick={() =>
                      localStorage.setItem(
                        SCROLL_KEY,
                        JSON.stringify({
                          orderId: order.orderId,
                          timestamp: Date.now(),
                        })
                      )
                    }
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    צפייה
                  </Link>

                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(order.orderId)}
                  >
                    מחק
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
