"use client";

import { showToast } from "@/components/cms/ui/toast";

type PaymentMethod = "" | "credit" | "paybox" | "cash";

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
    isNotified?: boolean;
    paymentMethod?: PaymentMethod | null; // NEW
  };

  finalTotal: number;
  onDelete: () => void;
  onMarkTest: (flag: boolean) => void;
  onEdit: () => void;
  onPaymentChange: (m: PaymentMethod | null) => void; // NEW
  onReadyClick: () => void;
  handleTitleClick: () => void;
  onNotifyWhatsApp?: () => Promise<void>;
};

export default function ClientControlPanel({
  order,
  finalTotal,
  onDelete,
  onMarkTest,
  onEdit,
  onPaymentChange, // NEW
  onReadyClick,
  handleTitleClick,
  onNotifyWhatsApp,
}: Props) {
  const phone = order.clientPhone;
  const name = order.clientName;
  const address = order.clientAddress;

  // normalize current payment method for the select
  const currentPM: PaymentMethod = (order.paymentMethod ?? "") as PaymentMethod;

  // consider paid if a method is selected or legacy isPaid is true
  const effectivePaid = currentPM !== "" || order.isPaid;

  const testStyle = order.isTest
    ? "bg-yellow-200 border-2 border-yellow-700 text-yellow-950"
    : "";

  const completedStyle =
    !order.isTest && effectivePaid && order.isReady
      ? "bg-green-200 border-2 border-green-700 text-green-950"
      : "";

  const waMessage = ``;
  const waPhone = phone?.replace(/[^0-9]/g, "").replace(/^0/, "972");
  const waLink = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`
    : "#";

  return (
    <div className={`border p-4 rounded shadow ${testStyle || completedStyle}`}>
      {/* ───────── header ───────── */}
      <div className="flex items-start justify-between">
        <h1
          title="לחץ 5 פעמים לסימון כבדיקה"
          onClick={handleTitleClick}
          className={`text-xl font-bold mb-2 select-none ${
            order.isTest ? "text-orange-700" : ""
          }`}
        >
          הזמנה #{order.orderId}
        </h1>

        <div className="flex gap-2 flex-wrap">
          {order.isTest && (
            <button
              onClick={() => onMarkTest(false)}
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded"
            >
              הסר בדיקה
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded"
          >
            🗑️ מחק הזמנה
          </button>
          {!order.isTest && order.isNotified === false && onNotifyWhatsApp && (
            <button
              onClick={onNotifyWhatsApp}
              className="text-sm bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded"
            >
              💬 שלח הודעת הזמנה
            </button>
          )}
        </div>
      </div>

      {!order.isTest && order.isNotified === false && (
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
          ⚠️ ההזמנה עדיין לא קיבלה הודעת וואטסאפ
        </div>
      )}

      <p>שם: {name ?? "—"}</p>
      <p>כתובת: {address ?? "—"}</p>
      <p>
        טלפון:&nbsp;
        <button
          onClick={() => {
            navigator.clipboard
              .writeText(phone)
              .then(() => showToast("📋 מספר הטלפון הועתק", "success"))
              .catch(() => showToast("❌ כשל בהעתקה ללוח", "error"));
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
          📞 התקשר
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
              showToast("מספר טלפון לא זמין או לא תקין", "error");
            }
          }}
        >
          💬 וואטסאפ
        </a>
      </div>

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

      {/* Controls row */}
      <div className="mt-4 flex gap-4 flex-wrap items-center">
        {/* NEW: Payment method select */}
        <div className="flex items-center gap-2">
          <label
            className="text-sm font-medium"
            htmlFor={`pm-${order.orderId}`}
          >
            אמצעי תשלום:
          </label>
          <select
            id={`pm-${order.orderId}`}
            dir="rtl"
            className="border px-2 py-1 rounded"
            value={currentPM}
            onChange={(e) => {
              const v = e.target.value as PaymentMethod;
              onPaymentChange(v === "" ? null : v);
            }}
            title="בחר אמצעי תשלום"
            aria-label="בחר אמצעי תשלום"
          >
            <option value="">לא שולם</option>
            <option value="credit">אשראי</option>
            <option value="paybox">פייבוקס</option>
            <option value="cash">מזומן</option>
          </select>
        </div>

        {/* Ready toggle */}
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

      <div className="mt-4 text-lg font-bold">
        סה״כ להזמנה (כולל משלוח): ₪{finalTotal.toFixed(2)}
      </div>
    </div>
  );
}
