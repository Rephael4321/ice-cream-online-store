"use client";

import { memo, useEffect, useRef, useState } from "react";
import { List } from "react-window";
import { Button, showToast, Input } from "@/components/cms/ui";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import { useAuth } from "@/components/auth/auth-context";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import SingleOrder from "./ui/list/single-order";
import {
  apiDelete,
  apiGet,
  apiPatch,
} from "@/lib/api/client";

const DEBOUNCE_MS = 350;
const SEARCHING_MESSAGE_DELAY_MS = 2000;
// Card height: smaller than 340 so rows aren’t over-spaced; gap like client list (172+16=188)
const ROW_HEIGHT = 260;
const ROW_GAP = 8;
const ITEM_SIZE = ROW_HEIGHT + ROW_GAP;
const OVERSCAN_COUNT = 3;

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
  clientOtherUnpaidCount?: number;
  clientUnpaidTotal?: number | null;
};

type OrderRowProps = {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: string };
  orders: Order[];
  onDelete: (id: number) => void;
  selectMode: boolean;
  selectedOrders: Set<number>;
  onSelectToggle: (id: number) => void;
  onEnterSelectMode: (id: number) => void;
  onChangePayment: (orderId: number, method: PaymentMethod) => void;
  onToggleReady: (orderId: number, current: boolean) => void;
  onToggleDelivered: (orderId: number, current?: boolean) => void;
  canEditPayment: boolean;
  canEditDebt: boolean;
  onDebtUpdated: () => void;
};

const OrderRow = memo(function OrderRow({
  index,
  style,
  ariaAttributes,
  orders,
  onDelete,
  selectMode,
  selectedOrders,
  onSelectToggle,
  onEnterSelectMode,
  onChangePayment,
  onToggleReady,
  onToggleDelivered,
  canEditPayment,
  canEditDebt,
  onDebtUpdated,
}: OrderRowProps) {
  const order = orders[index];
  if (!order) return null;
  return (
    <div style={style} className="pr-0" {...ariaAttributes}>
      <div
        style={{
          height: ROW_HEIGHT,
          minHeight: ROW_HEIGHT,
          marginBottom: ROW_GAP,
        }}
        className="overflow-hidden [&>li]:m-0 [&>li]:block [&>li]:list-none"
      >
        <SingleOrder
          order={order}
          onDelete={onDelete}
          selectMode={selectMode}
          selected={selectedOrders.has(order.orderId)}
          onSelectToggle={() => onSelectToggle(order.orderId)}
          onEnterSelectMode={() => onEnterSelectMode(order.orderId)}
          onChangePayment={(m) => onChangePayment(order.orderId, m)}
          onToggleReady={() => onToggleReady(order.orderId, order.isReady)}
          onToggleDelivered={() =>
            onToggleDelivered(order.orderId, order.isDelivered)
          }
          canEditPayment={canEditPayment}
          canEditDebt={canEditDebt}
          onDebtUpdated={onDebtUpdated}
        />
      </div>
    </div>
  );
});

const SCROLL_KEY = "lastViewedOrder";
const sanitizePaymentMethod = (v: unknown): PaymentMethod =>
  v === "credit" || v === "paybox" || v === "cash" ? v : "";

export default function ListOrder() {
  const { role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [hasUnnotified, setHasUnnotified] = useState(false);
  const [showSearchingMessage, setShowSearchingMessage] = useState(false);
  const [listHeight, setListHeight] = useState(500);

  const canEditPayment = role !== "driver";

  const listContainerRef = useRef<HTMLDivElement>(null);
  const searchingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getLast7DaysRange = () => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    const format = (d: Date) => d.toISOString().split("T")[0];
    return { from: format(from), to: format(now) };
  };

  // 🔁 unified loader:
  // - if `pending` true -> /api/orders?pending=1
  // - if `unpaidOnly` true -> add unpaid=1
  // - else optional date range -> /api/orders?from=...&to=...
  const fetchOrders = async (opts?: {
    pending?: boolean;
    unpaid?: boolean;
    from?: string;
    to?: string;
  }) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (opts?.pending) params.set("pending", "1");
    if (opts?.unpaid) params.set("unpaid", "1");
    if (opts?.from && opts?.to) {
      params.set("from", opts.from);
      params.set("to", opts.to);
    }
    const query = params.toString() ? `?${params.toString()}` : "";

    try {
      const res = await apiGet(`/api/orders${query}`, { cache: "no-store" });
      const data = await res.json();
      const list: Order[] = (data.orders || []).map((o: any) => ({
        ...o,
        paymentMethod: sanitizePaymentMethod(o.paymentMethod),
        clientOtherUnpaidCount: o.clientOtherUnpaidCount != null ? Number(o.clientOtherUnpaidCount) : 0,
        clientUnpaidTotal: o.clientUnpaidTotal != null ? Number(o.clientUnpaidTotal) : null,
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
      await fetchOrders({
        pending: true,
        unpaid: unpaidOnly,
      });
      return;
    }
    setShowSearchingMessage(false);
    if (searchingDelayRef.current) clearTimeout(searchingDelayRef.current);
    searchingDelayRef.current = setTimeout(() => {
      setShowSearchingMessage(true);
      searchingDelayRef.current = null;
    }, SEARCHING_MESSAGE_DELAY_MS);
    try {
      const res = await apiGet(
        `/api/orders/search?query=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const list: Order[] = (data.orders || []).map((o: any) => ({
        ...o,
        paymentMethod: sanitizePaymentMethod(o.paymentMethod),
        clientOtherUnpaidCount: o.clientOtherUnpaidCount != null ? Number(o.clientOtherUnpaidCount) : 0,
        clientUnpaidTotal: o.clientUnpaidTotal != null ? Number(o.clientUnpaidTotal) : null,
      }));
      setOrders(list);
      setHasUnnotified(
        list.some((o) => o.isNotified === false && o.isTest !== true)
      );
    } catch {
      showToast("❌ שגיאה בחיפוש", "error");
    } finally {
      if (searchingDelayRef.current) {
        clearTimeout(searchingDelayRef.current);
        searchingDelayRef.current = null;
      }
      setShowSearchingMessage(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Single source: when debouncedSearch / selectedDate / unpaidOnly change → search or fetch by date
  useEffect(() => {
    if (debouncedSearch) {
      searchOrders(debouncedSearch);
    } else {
      if (selectedDate === null) {
        fetchOrders({ pending: true, unpaid: unpaidOnly });
      } else {
        const dateStr = selectedDate.toLocaleDateString("sv-SE");
        fetchOrders({ from: dateStr, to: dateStr, unpaid: unpaidOnly });
      }
    }
  }, [debouncedSearch, selectedDate, unpaidOnly]);

  // 🔄 Refresh when page becomes visible (handles mobile back button)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        if (debouncedSearch.trim()) {
          searchOrders(debouncedSearch.trim());
        } else if (selectedDate === null) {
          fetchOrders({ pending: true, unpaid: unpaidOnly });
        } else {
          const dateStr = selectedDate.toLocaleDateString("sv-SE");
          fetchOrders({ from: dateStr, to: dateStr, unpaid: unpaidOnly });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [debouncedSearch, selectedDate, unpaidOnly, loading]);

  // ResizeObserver for virtual list height
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setListHeight(el.clientHeight);
    });
    ro.observe(el);
    setListHeight(el.clientHeight);
    return () => ro.disconnect();
  }, [loading, orders.length]);

  // 🔖 Restore scroll-to-last-viewed (virtual list: scroll to index if possible)
  useEffect(() => {
    const raw = localStorage.getItem(SCROLL_KEY);
    if (!raw || orders.length === 0) return;
    try {
      const { orderId, timestamp } = JSON.parse(raw);
      const now = Date.now();
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      if (now - timestamp > FOUR_HOURS) {
        localStorage.removeItem(SCROLL_KEY);
        return;
      }
      const index = orders.findIndex((o) => o.orderId === orderId);
      if (index >= 0) {
        const el = document.querySelector(`[data-order-id="${orderId}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
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

  const handleDebtUpdated = () => {
    if (debouncedSearch.trim()) searchOrders(debouncedSearch);
    else if (selectedDate !== null) {
      const dateStr = selectedDate.toLocaleDateString("sv-SE");
      fetchOrders({ from: dateStr, to: dateStr, unpaid: unpaidOnly });
    } else fetchOrders({ pending: true, unpaid: unpaidOnly });
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

  const onEnterSelectMode = (id: number) => {
    setSelectMode(true);
    toggleOrderSelection(id);
  };

  return (
    <main
      dir="rtl"
      className="h-full flex flex-col overflow-hidden w-full max-w-full mx-auto relative"
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

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden py-4 space-y-4">
        {/* 🔍 Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="font-semibold">סנן לפי תאריך:</label>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              placeholderText="בחר תאריך"
              dateFormat="dd/MM/yyyy"
              className="border px-3 py-2 rounded"
              isClearable
              disabled={searchQuery.trim().length > 0}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unpaidOnly}
              onChange={(e) => setUnpaidOnly(e.target.checked)}
              className="rounded"
            />
            <span className="font-medium">רק לא שולמו</span>
          </label>

          <Input
            type="text"
            placeholder="חיפוש לפי שם, כתובת, טלפון או מספר הזמנה"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-xs"
          />
          {showSearchingMessage && (
            <span className="text-sm text-gray-500 self-end pb-2">מחפש...</span>
          )}
        </div>

        {hasUnnotified && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm font-medium flex-shrink-0">
            ⚠️ ישנן הזמנות שלא נשלחה אליהן הודעת וואטסאפ.
          </div>
        )}

        {loading ? (
          <p className="flex-shrink-0">טוען הזמנות...</p>
        ) : orders.length === 0 ? (
          <p className="flex-shrink-0">לא נמצאו הזמנות.</p>
        ) : (
          <div
            ref={listContainerRef}
            dir="rtl"
            className="flex-1 min-h-0"
          >
            <List
              rowComponent={OrderRow}
              rowCount={orders.length}
              rowHeight={ITEM_SIZE}
              rowProps={{
                orders,
                onDelete: handleDelete,
                selectMode,
                selectedOrders,
                onSelectToggle: toggleOrderSelection,
                onEnterSelectMode,
                onChangePayment: updatePaymentMethod,
                onToggleReady: toggleReady,
                onToggleDelivered: toggleDelivered,
                canEditPayment,
                canEditDebt: role === "admin",
                onDebtUpdated: handleDebtUpdated,
              }}
              overscanCount={OVERSCAN_COUNT}
              defaultHeight={500}
              style={{ height: listHeight, width: "100%" }}
              dir="rtl"
            />
          </div>
        )}
      </div>
    </main>
  );
}
