"use client";

import { useCart } from "@/context/cart-context";
import { useState } from "react";

export default function Cart() {
  const { cartItems, removeFromCart, clearCart, getEffectiveUnitPrice } =
    useCart();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-400 text-white px-4 py-2 rounded cursor-pointer text-sm sm:text-base"
      >
        עגלת קניות ({cartItems.length})
      </button>

      {isOpen && (
        <div className="fixed top-0 left-0 h-full w-full sm:w-80 bg-white shadow-lg flex flex-col p-4 z-[1000] transition-all">
          <button
            onClick={() => setIsOpen(false)}
            className="self-end text-lg font-bold text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
          >
            ✕
          </button>

          {cartItems.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">העגלה ריקה</p>
          ) : (
            <ul className="flex flex-col gap-4 overflow-y-auto flex-grow">
              {cartItems.map((item) => {
                const unitPrice = getEffectiveUnitPrice(item);
                const itemTotal = unitPrice * item.quantity;

                return (
                  <li
                    key={item.productName}
                    className="flex justify-between items-start border-b pb-2"
                  >
                    <div className="text-sm sm:text-base space-y-1">
                      <p className="font-semibold">{item.productName}</p>
                      <p>כמות: {item.quantity}</p>
                      <p>מחיר: {itemTotal.toFixed(2)} ש״ח</p>
                      {item.sale?.fromCategory && item.sale?.category && (
                        <p className="text-sm text-green-600">
                          מבצע מקטגוריית{" "}
                          <span className="font-bold">
                            {item.sale.category.name}
                          </span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.productName)}
                      className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
                    >
                      הסר
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {cartItems.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-right font-bold">
                סה״כ:{" "}
                {cartItems
                  .reduce(
                    (sum, item) =>
                      sum + getEffectiveUnitPrice(item) * item.quantity,
                    0
                  )
                  .toFixed(2)}{" "}
                ש״ח
              </p>

              <button
                onClick={() => alert("המשך לתשלום (בעתיד)")}
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition cursor-pointer"
              >
                לתשלום
              </button>
              <button
                onClick={clearCart}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition cursor-pointer"
              >
                ניקוי עגלה
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
