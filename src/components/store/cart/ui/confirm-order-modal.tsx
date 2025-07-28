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

  const orderUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  }/order/${orderId}`;

  const encodedMessage = `מספר הזמנה ${orderId}.\n\nניתן לצפות בפירוט הזמנה בקישור הבא:\n${orderUrl}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1100] p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm space-y-4 text-center">
        {phoneModal && (
          <>
            <h2 className="text-lg font-bold mb-2">
              נא להזין טלפון לצורך ביצוע הזמנה
            </h2>
            <input
              type="tel"
              value={phoneInput}
              onChange={onPhoneChange}
              placeholder="למשל: 050-123-4567"
              className="w-full border px-3 py-2 rounded text-right"
            />
            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={onPhoneClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                ביטול
              </button>
              <button
                onClick={onPhoneSave}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                שמור והמשך
              </button>
            </div>
          </>
        )}

        {showWhatsappConfirm && (
          <>
            <p className="text-lg font-bold">
              ההזמנה בוצעה בהצלחה. מספר הזמנה {orderId}.
              <br />
              בכדי להבטיח אימות הזמנה, שלחו הודעה לספק השירות.
            </p>
            <pre className="text-xs text-left whitespace-pre-wrap bg-gray-100 rounded p-2 border border-gray-200">
              {encodedMessage}
            </pre>
            <div className="flex gap-4">
              <button
                onClick={onCancelWhatsapp}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                לא עכשיו
              </button>
              <button
                onClick={onConfirmWhatsapp}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                כן, שלח
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
