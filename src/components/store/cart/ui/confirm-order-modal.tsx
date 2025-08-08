"use client";

import React from "react";

interface Props {
  // Step 1 (enter phone)
  phoneModal: boolean;
  phoneInput: string;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneClose: () => void;
  onPhoneSave: () => void;

  // Step 2 (confirm phone)
  confirmPhoneModal: boolean;
  pendingPhone: string;
  onPendingPhoneChange: (value: string) => void;
  onConfirmPhoneClose: () => void;
  onConfirmPhoneSend: () => void;

  // After order created: WhatsApp confirm
  showWhatsappConfirm: boolean;
  onCancelWhatsapp: () => void;
  onConfirmWhatsapp: () => void;
  orderId: number;
  hasOutOfStock: boolean;

  // formatting helper (pretty only; parent handles normalization)
  formatPhone: (phone: string) => string;
}

export default function ConfirmOrderModal({
  phoneModal,
  phoneInput,
  onPhoneChange,
  onPhoneClose,
  onPhoneSave,

  confirmPhoneModal,
  pendingPhone,
  onPendingPhoneChange,
  onConfirmPhoneClose,
  onConfirmPhoneSend,

  showWhatsappConfirm,
  onCancelWhatsapp,
  onConfirmWhatsapp,
  orderId,
  hasOutOfStock,

  formatPhone,
}: Props) {
  if (!phoneModal && !confirmPhoneModal && !showWhatsappConfirm) return null;

  const onlyDigits = (s: string) => s.replace(/\D/g, "");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1100] p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm space-y-4 text-center">
        {/* Step 1: ask for phone */}
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
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
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

        {/* Step 2: confirm phone */}
        {confirmPhoneModal && (
          <>
            <h2 className="text-lg font-bold mb-2">נא לאשר מספר טלפון</h2>

            <div className="text-right space-y-2">
              <label className="block text-sm text-gray-600">מספר טלפון</label>
              <input
                type="tel"
                value={formatPhone(pendingPhone)}
                onChange={(e) =>
                  onPendingPhoneChange(onlyDigits(e.target.value))
                }
                className="w-full border px-3 py-2 rounded text-right"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                maxLength={13}
              />
              <p className="text-xs text-gray-500">
                בדוק שהמספר נכון לפני שליחה.
              </p>
            </div>

            <div className="flex justify-between gap-4 mt-4">
              <button
                onClick={onConfirmPhoneClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                המשך בקנייה
              </button>
              <button
                onClick={onConfirmPhoneSend}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
              >
                אשר ושלח הזמנה
              </button>
            </div>
          </>
        )}

        {/* After order created: WhatsApp confirm */}
        {showWhatsappConfirm && (
          <>
            <p className="text-lg font-bold">
              ההזמנה בוצעה בהצלחה. מספר הזמנה {orderId}.
              <br />
              בכדי להבטיח אימות הזמנה, שלחו הודעה לספק השירות.
            </p>

            {hasOutOfStock && (
              <p className="text-red-600 text-sm font-medium mt-2">
                לתשומת לבך: חלק מהמוצרים אזלו מהמלאי.
              </p>
            )}

            <div className="flex gap-4 mt-4">
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
