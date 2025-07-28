"use client";

import Link from "next/link";
import { Button } from "@/components/cms/ui/button";
import { useRef } from "react";

type Props = {
  order: {
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
  onDelete: (id: number) => void;
  selectMode?: boolean;
  selected?: boolean;
  onSelectToggle?: () => void;
  onEnterSelectMode?: () => void;
};

const SCROLL_KEY = "lastViewedOrder";

export default function SingleOrder({
  order,
  onDelete,
  selectMode = false,
  selected = false,
  onSelectToggle,
  onEnterSelectMode,
}: Props) {
  const date = new Date(order.createdAt);
  const formatted = !isNaN(date.getTime())
    ? date.toLocaleString("he-IL")
    : order.createdAt;

  const testStyle = order.isTest ? "bg-yellow-100 border-yellow-400" : "";
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
    if (selectMode) {
      onSelectToggle?.();
    }
  };

  return (
    <li
      data-order-id={order.orderId}
      className={`relative border rounded p-4 shadow transition-all duration-200 ${testStyle} ${
        selectMode ? "ring-2 ring-blue-400" : ""
      }`}
      onClick={handleClickWrapper}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!selectMode && onEnterSelectMode) onEnterSelectMode();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelTouch}
      onTouchMove={cancelTouch}
    >
      {/* ✅ Selection Circle (always visible on md+, conditional on small screens) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!selectMode && onEnterSelectMode) {
            onEnterSelectMode();
          } else {
            onSelectToggle?.();
          }
        }}
        className={`absolute left-4 top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold z-10
          ${
            selected
              ? "bg-blue-500 text-white border-blue-500"
              : "border-gray-400"
          }
          ${selectMode ? "block" : "hidden"} md:block`}
        style={{ cursor: "pointer" }}
        title="בחר הזמנה"
      >
        {selected ? "✔" : ""}
      </div>

      <div className="flex justify-between items-start pl-10 gap-4">
        {/* 📝 Order Details */}
        <div className="flex-1">
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

        {/* 🔘 Action Buttons */}
        {!selectMode && (
          <div className="flex flex-col gap-2 items-end">
            <Link
              href={`/orders/${order.orderId}`}
              onClick={(e) => {
                e.stopPropagation();
                localStorage.setItem(
                  SCROLL_KEY,
                  JSON.stringify({
                    orderId: order.orderId,
                    timestamp: Date.now(),
                  })
                );
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
