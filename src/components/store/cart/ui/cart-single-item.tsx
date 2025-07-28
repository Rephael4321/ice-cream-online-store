"use client";

import { CartItem } from "@/context/cart-context";
import Image from "next/image";

interface Props {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

export default function CartSingleItem({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: Props) {
  const baseTotal = item.productPrice * item.quantity;
  let finalPrice = baseTotal;
  let discount = 0;

  if (item.sale && !item.sale.fromCategory) {
    const bundles = Math.floor(item.quantity / item.sale.amount);
    const remainder = item.quantity % item.sale.amount;
    finalPrice = bundles * item.sale.price + remainder * item.productPrice;
    discount = baseTotal - finalPrice;
  }

  return (
    <li
      className={`flex gap-3 items-start border-b pb-2 text-sm rounded ${
        item.inStock === false ? "opacity-50 grayscale" : ""
      }`}
    >
      <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-gray-200">
        <Image
          src={item.productImage || "/placeholder.png"}
          alt={item.productName}
          fill
          className="object-contain bg-white"
          sizes="64px"
        />
      </div>

      <div className="flex-1">
        <p className="font-semibold flex items-center gap-2">
          {item.productName}
          {item.inStock === false && (
            <span
              className="text-red-500 text-xs"
              title="מוצר זה אינו זמין כעת במלאי"
            >
              ❌ אזל מהמלאי
            </span>
          )}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onDecrease}
            disabled={!item.inStock}
            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50"
          >
            −
          </button>
          <span className="w-6 text-center">{item.quantity}</span>
          <button
            onClick={onIncrease}
            disabled={!item.inStock}
            className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50"
          >
            +
          </button>
        </div>

        <p>מחיר: {finalPrice.toFixed(2)} ש״ח</p>
        {discount > 0 && (
          <p className="text-green-600 text-xs">
            חסכת: {discount.toFixed(2)} ש״ח
          </p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
      >
        הסר
      </button>
    </li>
  );
}
