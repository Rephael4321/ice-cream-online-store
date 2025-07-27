"use client";

import { toast } from "sonner";

type Props = {
  order: {
    orderId: number;
    clientPhone: string;
    clientName: string | null;
    clientAddress: string | null;
    createdAt: string;
    isPaid: boolean;
    isReady: boolean;
    isTest?: boolean;
  };
  finalTotal: number;
  onDelete: () => void;
  onMarkTest: (flag: boolean) => void;
  onEdit: () => void;
  onTogglePaid: () => void;
  onReadyClick: () => void;
  handleTitleClick: () => void;
};

export default function ClientControlPanel({
  order,
  finalTotal,
  onDelete,
  onMarkTest,
  onEdit,
  onTogglePaid,
  onReadyClick,
  handleTitleClick,
}: Props) {
  const phone = order.clientPhone;
  const name = order.clientName;
  const address = order.clientAddress;

  const testStyle = order.isTest ? "bg-yellow-100 border-yellow-400" : "";

  const waMessage = `שלום${
    name ? " " + name : ""
  }, ההזמנה מוכנה והיא תצא בהקדם, סכום לתשלום: ₪${finalTotal.toFixed(2)} 🍦`;
  const waPhone = phone?.replace(/[^0-9]/g, "").replace(/^0/, "972");
  const waLink = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`
    : "#";

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
      <p>שם: {name ?? "—"}</p>
      <p>כתובת: {address ?? "—"}</p>
      <p>
        טלפון:&nbsp;
        <button
          onClick={() => {
            navigator.clipboard.writeText(phone);
            toast.success("📋 מספר הטלפון הועתק");
          }}
          className="underline text-blue-700 hover:text-blue-900"
        >
          {phone}
        </button>
      </p>

      <div className="flex items-center gap-4 mt-2">
        <a
          href={`tel:${phone}`}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition"
        >
          📞 התקשר
        </a>

        <a
          href={waLink}
          className={`text-sm px-3 py-1 rounded transition text-white ${
            waPhone
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!waPhone) {
              e.preventDefault();
              toast.error("מספר טלפון לא זמין או לא תקין");
            }
          }}
        >
          💬 וואטסאפ
        </a>
      </div>

      {/* ───────── edit / date ───────── */}
      <div className="mt-2">
        <button
          onClick={onEdit}
          className="text-sm bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition"
        >
          ✏️ ערוך פרטי לקוח
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
          {order.isPaid ? "שולם ✅" : "לא שולם ❌"}
        </button>

        <button
          onClick={onReadyClick}
          className={`px-3 py-1 rounded text-white transition ${
            order.isReady
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {order.isReady ? "הזמנה מוכנה ✅" : "הזמנה חדשה 🆕"}
        </button>
      </div>
    </div>
  );
}
