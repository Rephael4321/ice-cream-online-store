"use client";

import { toast } from "sonner";

/** Props coming from `<OrderDetails />` */
type Props = {
  order: {
    orderId: number;
    phone: string;
    name: string | null;
    address: string | null;
    createdAt: string;
    isPaid: boolean;
    isReady: boolean;
    isTest?: boolean;
  };
  onDelete: () => void;
  onMarkTest: (flag: boolean) => void;
  onEdit: () => void;
  onTogglePaid: () => void;
  /** “הזמנה מוכנה / חדשה” — opens WA when something missing                */
  onReadyClick: () => void;
  /** hidden 5‑click Easter‑egg                                                */
  handleTitleClick: () => void;
};

export default function ClientControlPanel({
  order,
  onDelete,
  onMarkTest,
  onEdit,
  onTogglePaid,
  onReadyClick,
  handleTitleClick,
}: Props) {
  const testStyle = order.isTest ? "bg-yellow-100 border-yellow-400" : "";

  return (
    <div className={`border p-4 rounded shadow ${testStyle}`}>
      {/* ───────── header ───────── */}
      <div className="flex items-start justify-between">
        <h1
          title="לחץ 5 פעמים לסימון כבדיקה"
          onClick={handleTitleClick}
          className={`text-xl font-bold mb-2 select-none ${
            order.isTest ? "text-orange-600" : ""
          }`}
        >
          הזמנה #{order.orderId}
        </h1>

        <div className="flex gap-2">
          {order.isTest && (
            <button
              onClick={() => onMarkTest(false)}
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
            >
              הסר בדיקה
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded"
          >
            🗑️ מחק הזמנה
          </button>
        </div>
      </div>

      {/* ───────── contact ───────── */}
      <p>שם: {order.name ?? "—"}</p>
      <p>כתובת: {order.address ?? "—"}</p>
      <p>
        טלפון:&nbsp;
        <button
          onClick={() => {
            navigator.clipboard.writeText(order.phone);
            toast.success("📋 מספר הטלפון הועתק");
          }}
          className="underline text-blue-700 hover:text-blue-900"
        >
          {order.phone}
        </button>
      </p>

      <div className="flex items-center gap-4 mt-2">
        <a
          href={`tel:${order.phone}`}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition"
        >
          📞 התקשר
        </a>
        <a
          href={`https://wa.me/${order.phone
            .replace(/[^0-9]/g, "")
            .replace(/^0/, "972")}?text=${encodeURIComponent("")}`}
          className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition"
          rel="noopener noreferrer"
        >
          💬 וואטסאפ
        </a>
      </div>

      {/* ───────── edit / date ───────── */}
      <div className="mt-2">
        <button
          onClick={onEdit}
          className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition"
        >
          ✏️ ערוך פרטי לקוח
        </button>
      </div>

      <p className="mt-2">
        תאריך:&nbsp;
        {isNaN(new Date(order.createdAt).getTime())
          ? order.createdAt
          : new Date(order.createdAt).toLocaleString("he-IL")}
      </p>

      {/* ───────── status buttons ───────── */}
      <div className="mt-4 flex gap-4 flex-wrap">
        <button
          onClick={onTogglePaid}
          className={`px-3 py-1 rounded text-white transition ${
            order.isPaid
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {order.isPaid ? "שולם ✅" : "לא שולם ❌"}
        </button>

        <button
          onClick={onReadyClick}
          className={`px-3 py-1 rounded text-white transition ${
            order.isReady
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {order.isReady ? "הזמנה מוכנה ✅" : "הזמנה חדשה 🆕"}
        </button>
      </div>
    </div>
  );
}
