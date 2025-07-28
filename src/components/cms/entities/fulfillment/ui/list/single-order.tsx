"use client";

import Link from "next/link";
import { Button } from "@/components/cms/ui/button";

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
};

const SCROLL_KEY = "lastViewedOrder";

export default function SingleOrder({ order, onDelete }: Props) {
  const date = new Date(order.createdAt);
  const formatted = !isNaN(date.getTime())
    ? date.toLocaleString("he-IL")
    : order.createdAt;

  const testStyle = order.isTest ? "bg-yellow-100 border-yellow-400" : "";

  return (
    <li
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

        <Button variant="destructive" onClick={() => onDelete(order.orderId)}>
          מחק
        </Button>
      </div>
    </li>
  );
}
