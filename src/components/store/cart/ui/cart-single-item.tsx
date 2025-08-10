"use client";

import { CartItem } from "@/context/cart-context";
import Image from "next/image";

interface Props {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
  perItemGroupDiscount?: number;
}

export default function CartSingleItem({
  item,
  onDecrease,
  onIncrease,
  onRemove,
  perItemGroupDiscount = 0,
}: Props) {
  const baseTotal = item.productPrice * item.quantity;

  // Do NOT apply per-item sale if item participates in a sale group (to avoid double-discount).
  const inGroup = Boolean((item as any).saleGroup);

  let afterItemSale = baseTotal;
  if (item.sale && !item.sale.fromCategory && !inGroup) {
    const bundles = Math.floor(item.quantity / item.sale.amount);
    const remainder = item.quantity % item.sale.amount;
    afterItemSale = bundles * item.sale.price + remainder * item.productPrice;
  }

  const payable = Math.max(0, afterItemSale - perItemGroupDiscount);
  const discount = Math.max(
    0,
    baseTotal - afterItemSale + perItemGroupDiscount
  );

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

        <p>מחיר: {payable.toFixed(2)} ש״ח</p>
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
