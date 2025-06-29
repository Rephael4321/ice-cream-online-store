"use client";

import { useCart } from "@/context/cart-context";
import { useState } from "react";
import { IceCreamsSales, PopsiclesSales } from "@/data/products";
import { IceCreamsProducts, PopsiclesProducts } from "@/data/products";

export default function Cart() {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  function calculateDiscountedPrice(
    productName: string,
    quantity: number
  ): number {
    let product = IceCreamsProducts.find((p) => p.name === productName);
    let sales = IceCreamsSales;

    if (!product) {
      product = PopsiclesProducts.find((p) => p.name === productName);
      sales = PopsiclesSales;
    }

    if (!product) return 0;

    const sale = sales[product.id];

    if (sale) {
      const bundlesCount = Math.floor(quantity / sale.amount);
      const remainder = quantity % sale.amount;
      return bundlesCount * sale.price + remainder * product.price;
    } else {
      return product.price * quantity;
    }
  }

  return (
    <>
      {/* Cart toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-400 text-white px-4 py-2 rounded cursor-pointer text-sm sm:text-base"
      >
        עגלת קניות ({cartItems.length})
      </button>

      {/* Cart drawer */}
      {isOpen && (
        <div className="fixed top-0 left-0 h-full w-full sm:w-80 bg-white shadow-lg flex flex-col p-4 z-[1000] transition-all">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="self-end text-lg font-bold text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
          >
            ✕
          </button>

          {/* Cart items */}
          {cartItems.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">העגלה ריקה</p>
          ) : (
            <ul className="flex flex-col gap-4 overflow-y-auto flex-grow">
              {cartItems.map((item) => (
                <li
                  key={item.productName}
                  className="flex justify-between items-start border-b pb-2"
                >
                  <div className="text-sm sm:text-base space-y-1">
                    <p className="font-semibold">{item.productName}</p>
                    <p>כמות: {item.quantity}</p>
                    <p>
                      מחיר:{" "}
                      {calculateDiscountedPrice(
                        item.productName,
                        item.quantity
                      )}{" "}
                      ש&quot;ח
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productName)}
                    className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
                  >
                    הסר
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Action buttons */}
          {cartItems.length > 0 && (
            <div className="mt-4 space-y-2">
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
