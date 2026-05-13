"use client";

import { useState } from "react";
import { Button, Input, Label, showToast } from "@/components/cms/ui";
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddressDisplay } from "../address-display";
import { apiPatch } from "@/lib/api/client";

type PaymentMethod = "" | "credit" | "paybox" | "cash";

type Props = {
  order: {
    orderId: number;
    createdAt: string;
    itemCount: number;
    isPaid: boolean;
    isReady: boolean;
    isTest?: boolean;
    isNotified?: boolean;
    clientName: string | null;
    clientAddress: string | null;
    clientAddressLat?: number | null;
    clientAddressLng?: number | null;
    clientPhone: string | null;
    paymentMethod?: PaymentMethod | null;
    clientId?: number | null;
    clientOtherUnpaidCount?: number;
    clientUnpaidTotal?: number | null;
  };
  onDelete: (id: number) => void;
  selectMode?: boolean;
  selected?: boolean;
  onSelectToggle?: () => void;
  onEnterSelectMode?: () => void;
  onChangePayment: (m: PaymentMethod | null) => void;
  onToggleReady: () => void;
  onToggleDelivered?: () => void;
  /** When false (e.g. driver on list), payment is read-only. Default true. */
  canEditPayment?: boolean;
  /** When true (admin), show edit-debt control. */
  canEditDebt?: boolean;
  /** Called after debt adjustment so parent can refetch. */
  onDebtUpdated?: () => void;
};

const SCROLL_KEY = "lastViewedOrder";

export default function SingleOrder({
  order,
  onDelete,
  selectMode = false,
  selected = false,
  onSelectToggle,
  onEnterSelectMode,
  onChangePayment,
  onToggleReady,
  onToggleDelivered,
  canEditPayment = true,
  canEditDebt = false,
  onDebtUpdated,
}: Props) {
  const router = useRouter();
  const [editingDebt, setEditingDebt] = useState(false);
  const [debtInput, setDebtInput] = useState("");
  const [savingDebt, setSavingDebt] = useState(false);

  const date = new Date(order.createdAt);
  const formatted = !isNaN(date.getTime())
    ? date.toLocaleString("he-IL")
    : order.createdAt;

  // ✅ Normalize to a local that includes "" so comparisons are valid
  const currentPM: PaymentMethod = (order.paymentMethod ?? "") as PaymentMethod;

  // ✅ No TS2367: compare the normalized value to ""
  const effectivePaid = currentPM !== "" || order.isPaid;

  const testStyle = order.isTest
    ? "bg-yellow-200 border-2 border-yellow-700 text-yellow-950"
    : "";

  const completedStyle =
    !order.isTest && effectivePaid && order.isReady
      ? "bg-green-200 border-2 border-green-700 text-green-950"
      : "";

  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLongPress = () => {
    if (!selectMode && onEnterSelectMode) onEnterSelectMode();
  };

  const handleTouchStart = () => {
    touchTimeoutRef.current = setTimeout(handleLongPress, 600);
  };

  const cancelTouch = () => {
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
  };

  const handleClickWrapper = () => {
    if (selectMode) onSelectToggle?.();
  };

  const showUnnotified = order.isNotified === false && order.isTest !== true;

  return (
    <li
      data-order-id={order.orderId}
      className={`relative rounded p-4 shadow transition-all duration-200 border
        ${testStyle || completedStyle}
        ${selectMode ? "ring-2 ring-blue-400" : ""}`}
      onClick={handleClickWrapper}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!selectMode && onEnterSelectMode) onEnterSelectMode();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelTouch}
      onTouchMove={cancelTouch}
    >
      {/* ✅ Selection Circle (RTL: right side) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!selectMode && onEnterSelectMode) {
            onEnterSelectMode();
          } else {
            onSelectToggle?.();
          }
        }}
        className={`absolute right-4 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold z-10
          ${
            selected
              ? "bg-blue-500 text-white border-blue-500"
              : "border-gray-400"
          }
          ${selectMode ? "block" : "hidden"} md:block`}
        style={{ cursor: "pointer" }}
        title="בחר הזמנה"
        role="checkbox"
        aria-checked={selected}
      >
        {selected ? "✔" : ""}
      </div>

      <div className="flex justify-between items-start pr-10 gap-4">
        {/* 📝 Order Details */}
        <div className="flex-1">
          <p className="font-bold flex items-center gap-2">
            הזמנה #{order.orderId}
            {order.isTest && (
              <span className="text-yellow-900 text-sm">🧪 בדיקה</span>
            )}
            {showUnnotified && (
              <span className="text-red-700 text-sm font-semibold">
                ⚠️ לא נשלחה הודעה
              </span>
            )}
          </p>
          <p>לקוח: {order.clientName}</p>
          <div>
            כתובת:{" "}
            <AddressDisplay
              orderId={order.orderId}
              address={order.clientAddress}
              addressLat={order.clientAddressLat ?? null}
              addressLng={order.clientAddressLng ?? null}
            />
          </div>
          <p>טלפון: {order.clientPhone || "—"}</p>
          <p>תאריך: {formatted}</p>
          <p>כמות מוצרים: {order.itemCount}</p>

          {/* Status controls */}
          <div className="mt-2 flex gap-2 flex-wrap items-center">
            {/* Payment: editable for admin, read-only for driver on list */}
            <span className="text-sm font-medium">תשלום:</span>
            {canEditPayment ? (
              <select
                id={`pm-${order.orderId}`}
                dir="rtl"
                className="border px-2 py-1 rounded"
                value={currentPM}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const v = e.target.value as PaymentMethod;
                  onChangePayment(v === "" ? null : v);
                }}
                title="בחר אמצעי תשלום"
                aria-label="בחר אמצעי תשלום"
              >
                <option value="">לא שולם</option>
                <option value="credit">אשראי</option>
                <option value="paybox">פייבוקס</option>
                <option value="cash">מזומן</option>
              </select>
            ) : (
              <span className="text-sm">
                {effectivePaid
                  ? currentPM === "credit"
                    ? "אשראי"
                    : currentPM === "paybox"
                      ? "פייבוקס"
                      : currentPM === "cash"
                        ? "מזומן"
                        : "שולם"
                  : "לא שולם"}
              </span>
            )}

            {/* Ready toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleReady();
              }}
              className={`px-3 py-1 rounded text-white transition ${
                order.isReady
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-500 hover:bg-red-600"
              }`}
              title="שנה סטטוס הזמנה"
            >
              {order.isReady ? "מוכן ✅" : "הזמנה חדשה 🆕"}
            </button>

            {/* Delivered toggle */}
            {onToggleDelivered && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDelivered();
                }}
                className={`px-3 py-1 rounded text-white transition ${
                  (order as any).isDelivered
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
                title="שנה סטטוס משלוח"
              >
                {(order as any).isDelivered ? "נשלח 📦" : "לא נשלח 🚚"}
              </button>
            )}
          </div>

          {/* Client total debt (driver + admin) – clickable to payment page */}
          {order.clientId != null && order.clientUnpaidTotal != null && (
            <p className="mt-2 text-sm font-medium text-amber-800">
              <Link
                href={`/clients/${order.clientId}/payment`}
                onClick={(e) => e.stopPropagation()}
                className="underline hover:text-amber-900"
              >
                סה״כ חוב ללקוח: ₪{Number(order.clientUnpaidTotal).toFixed(2)}
              </Link>
              {canEditDebt && !editingDebt && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDebtInput(String(order.clientUnpaidTotal ?? 0));
                    setEditingDebt(true);
                  }}
                  className="mr-2 text-xs px-2 py-0.5 rounded border border-amber-500 text-amber-800 hover:bg-amber-100"
                >
                  ערוך חוב
                </button>
              )}
            </p>
          )}
          {canEditDebt && editingDebt && order.clientId != null && (
            <div
              className="mt-2 p-2 bg-amber-50 rounded border border-amber-200"
              onClick={(e) => e.stopPropagation()}
            >
              <Label htmlFor={`debt-${order.orderId}`}>סה״כ חוב חדש (₪)</Label>
              <Input
                id={`debt-${order.orderId}`}
                type="number"
                min={0}
                step={0.01}
                value={debtInput}
                onChange={(e) => setDebtInput(e.target.value)}
                dir="ltr"
                className="max-w-[120px] mt-1"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  disabled={savingDebt}
                  onClick={async () => {
                    const target = Number(debtInput);
                    if (!Number.isFinite(target) || target < 0) {
                      showToast("נא להזין סכום תקין", "warning");
                      return;
                    }
                    setSavingDebt(true);
                    try {
                      const r = await apiPatch(
                        `/api/clients/${order.clientId}/debt-adjustment`,
                        { targetTotalDebt: target }
                      );
                      if (!r.ok) throw new Error();
                      showToast("✅ סה״כ חוב עודכן", "success");
                      setEditingDebt(false);
                      onDebtUpdated?.();
                    } catch {
                      showToast("❌ שגיאה בעדכון חוב", "error");
                    } finally {
                      setSavingDebt(false);
                    }
                  }}
                >
                  {savingDebt ? "שומר..." : "שמור"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingDebt}
                  onClick={() => {
                    setEditingDebt(false);
                    setDebtInput("");
                  }}
                >
                  ביטול
                </Button>
              </div>
            </div>
          )}

          {/* Debt row: other unpaid orders for this client */}
          {!effectivePaid &&
            order.clientId != null &&
            (order.clientOtherUnpaidCount ?? 0) > 0 && (
              <p className="mt-2 text-sm">
                <Link
                  href={`/orders/client/${order.clientId}/unpaid`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-amber-700 underline hover:text-amber-800"
                >
                  {order.clientOtherUnpaidCount === 1
                    ? "יש ללקוח הזמנה נוספת שלא שולמה"
                    : `יש ללקוח עוד ${order.clientOtherUnpaidCount} הזמנות שלא שולמו`}
                </Link>
              </p>
            )}
        </div>

        {/* 🔘 Action Buttons */}
        {!selectMode && (
          <div className="flex flex-col gap-2 items-end">
            <Link
              href={`/orders/${order.orderId}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                localStorage.setItem(
                  SCROLL_KEY,
                  JSON.stringify({
                    orderId: order.orderId,
                    timestamp: Date.now(),
                  })
                );
                router.push(`/orders/${order.orderId}`);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              צפייה
            </Link>

            <Button
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(order.orderId);
              }}
            >
              מחק
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
