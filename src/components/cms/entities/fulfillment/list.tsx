"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import { Input } from "@/components/cms/ui/input";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import SingleOrder from "./ui/list/single-order";
import {
  apiDelete,
  apiGet,
  apiPatch,
} from "@/lib/api/client";

type PaymentMethod = null | "" | "credit" | "paybox" | "cash";

type Order = {
  orderId: number;
  clientId?: number | null;
  createdAt: string;
  itemCount: number;
  isPaid: boolean;
  isReady: boolean;
  isDelivered?: boolean;
  isTest?: boolean;
  isNotified?: boolean;
  clientName: string | null;
  clientAddress: string | null;
  clientAddressLat?: number | null;
  clientAddressLng?: number | null;
  clientPhone: string | null;
  paymentMethod?: PaymentMethod;
};

const SCROLL_KEY = "lastViewedOrder";
const sanitizePaymentMethod = (v: unknown): PaymentMethod =>
  v === "credit" || v === "paybox" || v === "cash" ? v : "";

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

  // 🔁 unified loader:
  // - if `pending` true -> /api/orders?pending=1
  // - else optional date range -> /api/orders?from=...&to=...
  const fetchOrders = async (opts?: {
    pending?: boolean;
    from?: string;
    to?: string;
  }) => {
    setLoading(true);
    let query = "";
    if (opts?.pending) {
      query = `?pending=1`;
    } else if (opts?.from && opts?.to) {
      query = `?from=${opts.from}&to=${opts.to}`;
    }

    try {
      const res = await apiGet(`/api/orders${query}`, { cache: "no-store" });
      const data = await res.json();
      const list: Order[] = (data.orders || []).map((o: any) => ({
        ...o,
        paymentMethod: sanitizePaymentMethod(o.paymentMethod),
      }));
      setOrders(list);
      setHasUnnotified(
        list.some((o) => o.isNotified === false && o.isTest !== true)
      );
    } catch {
      showToast("❌ שגיאה בטעינת הזמנות", "error");
    } finally {
      setLoading(false);
    }
  };

  const searchOrders = async (query: string) => {
    if (!query) {
      // ↩️ When clearing search, show PENDING by default
      await fetchOrders({ pending: true });
      return;
    }
    setLoading(true);
    try {
      const res = await apiGet(
        `/api/orders/search?query=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const list: Order[] = (data.orders || []).map((o: any) => ({
        ...o,
        paymentMethod: sanitizePaymentMethod(o.paymentMethod),
      }));
      setOrders(list);
      setHasUnnotified(
        list.some((o) => o.isNotified === false && o.isTest !== true)
      );
    } catch {
      showToast("❌ שגיאה בחיפוש", "error");
    } finally {
      setLoading(false);
    }
  };

  // ⏱️ On mount -> pending
  useEffect(() => {
    fetchOrders({ pending: true });
  }, []);

  // 🔄 Refresh when page becomes visible (handles mobile back button)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        // Only refresh if we're not already loading and page is visible
        if (search.trim()) {
          searchOrders(search.trim());
        } else if (selectedDate === null) {
          fetchOrders({ pending: true });
        } else {
          const dateStr = selectedDate.toLocaleDateString("sv-SE");
          fetchOrders({ from: dateStr, to: dateStr });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [search, selectedDate, loading]);

  // 📅 If a date is picked -> show that date only, else -> pending
  useEffect(() => {
    if (search.trim()) return; // search has priority
    if (selectedDate === null) {
      fetchOrders({ pending: true });
    } else {
      const dateStr = selectedDate.toLocaleDateString("sv-SE");
      fetchOrders({ from: dateStr, to: dateStr });
    }
  }, [selectedDate, search]);

  // 🔖 Restore scroll-to-last-viewed
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
      const res = await apiDelete(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error();
      showToast("🗑️ ההזמנה נמחקה", "success");
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      setSelectedOrders((prev) => {
        const updated = new Set(prev);
        updated.delete(orderId);
        return updated;
      });
    } catch {
      showToast("❌ תקלה במחיקה", "error");
    }
  };

  const handleMultiDelete = async () => {
    if (!confirm("האם למחוק את כל ההזמנות שנבחרו?")) return;
    const ids = Array.from(selectedOrders);
    const deleted: number[] = [];
    for (const id of ids) {
      const res = await apiDelete(`/api/orders/${id}`);
      if (res.ok) deleted.push(id);
    }
    showToast(`🗑️ נמחקו ${deleted.length} הזמנות`, "success");
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

  const updatePaymentMethod = async (
    orderId: number,
    method: PaymentMethod
  ) => {
    try {
      const r = await apiPatch(`/api/orders/${orderId}/payment`, {
        paymentMethod: method,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                paymentMethod: sanitizePaymentMethod(
                  (data.paymentMethod as PaymentMethod) ?? method ?? ""
                ),
                isPaid:
                  typeof data.isPaid === "boolean"
                    ? data.isPaid
                    : method === "credit" ||
                      method === "paybox" ||
                      method === "cash",
              }
            : o
        )
      );
    } catch {
      showToast("❌ שגיאה בעדכון אמצעי תשלום", "error");
    }
  };

  const toggleReady = async (orderId: number, current: boolean) => {
    try {
      const r = await apiPatch(`/api/orders/${orderId}/status`, {
        isReady: !current,
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
      showToast("❌ שגיאה בעדכון סטטוס הזמנה", "error");
    }
  };

  const toggleDelivered = async (orderId: number, current?: boolean) => {
    try {
      const r = await apiPatch(`/api/orders/${orderId}/delivery`, {
        isDelivered: !(current ?? false),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, isDelivered: data.isDelivered ?? !(current ?? false) }
            : o
        )
      );
    } catch {
      showToast("❌ שגיאה בעדכון סטטוס משלוח", "error");
    }
  };

  return (
    <main
      dir="rtl"
      className="px-4 sm:px-6 md:px-10 max-w-7xl mx-auto relative"
    >
      <HeaderHydrator title="הזמנות" />

      {selectMode && (
        <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[49] flex justify-between items-center bg-white border mt-6 p-3 rounded shadow w-full max-w-4xl">
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

      <div className="py-6 space-y-6">
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

          <Input
            type="text"
            placeholder="חיפוש לפי שם, כתובת, טלפון או מספר הזמנה"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full sm:max-w-xs"
          />
        </div>

        {hasUnnotified && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm font-medium">
            ⚠️ ישנן הזמנות שלא נשלחה אליהן הודעת וואטסאפ.
          </div>
        )}

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
                onChangePayment={(m) => updatePaymentMethod(order.orderId, m)}
                onToggleReady={() => toggleReady(order.orderId, order.isReady)}
                onToggleDelivered={() =>
                  toggleDelivered(order.orderId, order.isDelivered)
                }
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
