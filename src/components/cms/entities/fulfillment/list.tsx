"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/cms/ui/button";
import { toast } from "sonner";

import "react-datepicker/dist/react-datepicker.css";

import Link from "next/link";
import DatePicker from "react-datepicker";
import SingleOrder from "./ui/list/single-order";

type Order = {
  orderId: number;
  createdAt: string;
  itemCount: number;
  isPaid: boolean;
  isReady: boolean;
  isTest?: boolean;
  isNotified?: boolean;
  clientName: string | null;
  clientAddress: string | null;
  clientPhone: string | null;
};

const SCROLL_KEY = "lastViewedOrder";

export default function ListOrder() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [hasUnnotified, setHasUnnotified] = useState(false);

  const containerRef = useRef<HTMLUListElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const getLast7DaysRange = () => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    const format = (d: Date) => d.toISOString().split("T")[0];
    return { from: format(from), to: format(now) };
  };

  const fetchOrders = async (from?: string, to?: string) => {
    setLoading(true);
    let query = "";
    if (from && to) query = `?from=${from}&to=${to}`;
    const res = await fetch(`/api/orders${query}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setHasUnnotified(
      (data.orders || []).some(
        (o: Order) => o.isNotified === false && o.isTest !== true
      )
    );
    setLoading(false);
  };

  const searchOrders = async (query: string) => {
    if (!query) {
      const { from, to } = getLast7DaysRange();
      fetchOrders(from, to);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/search?query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      setOrders(data.orders || []);
      setHasUnnotified(
        (data.orders || []).some(
          (o: Order) => o.isNotified === false && o.isTest !== true
        )
      );
    } catch {
      toast.error("❌ שגיאה בחיפוש");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { from, to } = getLast7DaysRange();
    fetchOrders(from, to);
  }, []);

  useEffect(() => {
    if (search.trim()) return;
    if (selectedDate === null) {
      const { from, to } = getLast7DaysRange();
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
      setSelectedOrders((prev) => {
        const updated = new Set(prev);
        updated.delete(orderId);
        return updated;
      });
    } catch {
      toast.error("❌ תקלה במחיקה");
    }
  };

  const handleMultiDelete = async () => {
    if (!confirm("האם למחוק את כל ההזמנות שנבחרו?")) return;
    const ids = Array.from(selectedOrders);
    const deleted: number[] = [];

    for (const id of ids) {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (res.ok) deleted.push(id);
    }

    toast.success(`🗑️ נמחקו ${deleted.length} הזמנות`);
    setOrders((prev) => prev.filter((o) => !deleted.includes(o.orderId)));
    setSelectedOrders(new Set());
    setSelectMode(false);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      searchOrders(value.trim());
    }, 300);
  };

  const toggleOrderSelection = (id: number) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // NEW: toggles using split endpoints
  const togglePaid = async (orderId: number, current: boolean) => {
    try {
      const r = await fetch(`/api/orders/${orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !current }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId ? { ...o, isPaid: data.isPaid ?? !current } : o
        )
      );
    } catch {
      toast.error("❌ שגיאה בעדכון תשלום");
    }
  };

  const toggleReady = async (orderId: number, current: boolean) => {
    try {
      const r = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReady: !current }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, isReady: data.isReady ?? !current }
            : o
        )
      );
    } catch {
      toast.error("❌ שגיאה בעדכון סטטוס הזמנה");
    }
  };

  return (
    <div className="relative">
      {/* 🧭 Floating Toolbar */}
      {selectMode && (
        <div className="fixed top-[60px] left-1/2 -translate-x-1/2 z-[49] flex justify-between items-center bg-white border mt-12 p-3 rounded shadow w-full max-w-4xl">
          <span className="text-blue-800 font-semibold">
            {selectedOrders.size} נבחרו
          </span>
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() => {
                setSelectMode(false);
                setSelectedOrders(new Set());
              }}
            >
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleMultiDelete}>
              מחק נבחרים
            </Button>
          </div>
        </div>
      )}

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">📦 הזמנות</h1>

        {/* 🔍 Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="font-semibold">סנן לפי תאריך:</label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              placeholderText="בחר תאריך"
              dateFormat="dd/MM/yyyy"
              className="border px-3 py-2 rounded"
              isClearable
              disabled={search.trim().length > 0}
            />
          </div>

          <input
            type="text"
            placeholder="חיפוש לפי שם, כתובת, טלפון או מספר הזמנה"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full sm:max-w-xs px-3 py-2 border rounded"
          />
        </div>

        {/* ⚠️ WhatsApp Notification Warning */}
        {hasUnnotified && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm font-medium">
            ⚠️ ישנן הזמנות שלא נשלחה אליהן הודעת וואטסאפ.
          </div>
        )}

        {/* 📃 Orders List */}
        {loading ? (
          <p>טוען הזמנות...</p>
        ) : orders.length === 0 ? (
          <p>לא נמצאו הזמנות.</p>
        ) : (
          <ul className="space-y-4" ref={containerRef}>
            {orders.map((order) => (
              <SingleOrder
                key={order.orderId}
                order={order}
                onDelete={handleDelete}
                selectMode={selectMode}
                selected={selectedOrders.has(order.orderId)}
                onSelectToggle={() => toggleOrderSelection(order.orderId)}
                onEnterSelectMode={() => {
                  setSelectMode(true);
                  toggleOrderSelection(order.orderId);
                }}
                // NEW: clickable status buttons
                onTogglePaid={() => togglePaid(order.orderId, order.isPaid)}
                onToggleReady={() => toggleReady(order.orderId, order.isReady)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
