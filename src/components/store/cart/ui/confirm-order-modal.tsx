"use client";

import React from "react";

interface Props {
  phoneModal: boolean;
  phoneInput: string;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneClose: () => void;
  onPhoneSave: () => void;
  showWhatsappConfirm: boolean;
  onCancelWhatsapp: () => void;
  onConfirmWhatsapp: () => void;
  orderId: number;
}

export default function ConfirmOrderModal({
  phoneModal,
  phoneInput,
  onPhoneChange,
  onPhoneClose,
  onPhoneSave,
  showWhatsappConfirm,
  onCancelWhatsapp,
  onConfirmWhatsapp,
  orderId,
}: Props) {
  if (!phoneModal && !showWhatsappConfirm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-sm space-y-4">
        {phoneModal && (
          <>
            <h2 className="text-lg font-bold">
              נא להזין טלפון לצורך ביצוע הזמנה
            </h2>
            <input
              type="tel"
              value={phoneInput}
              onChange={onPhoneChange}
              className="w-full border p-2 rounded"
              placeholder="05X-XXXXXXX"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={onPhoneClose}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                ביטול
              </button>
              <button
                onClick={onPhoneSave}
                className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
              >
                אישור
              </button>
            </div>
          </>
        )}

        {showWhatsappConfirm && (
          <>
            <h2 className="text-lg font-bold">הזמנה נוצרה בהצלחה 🎉</h2>
            <p className="text-sm whitespace-pre-line">
              מספר הזמנה: {orderId}
              ניתן לצפות בפירוט הזמנה בקישור הבא:
              {`\n${
                process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
                "http://localhost:3000"
              }/order/${orderId}`}
            </p>
            <p className="text-sm">
              מעוניין לעבור לוואטסאפ כדי לשלוח את ההזמנה?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancelWhatsapp}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                לא תודה
              </button>
              <button
                onClick={onConfirmWhatsapp}
                className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
              >
                שלח לוואטסאפ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
