"use client";

import React from "react";

interface Props {
  categoryId: number;
  categoryName: string;
  items: {
    id: number;
    productName: string;
    quantity: number;
  }[];
  totalPrice: number;
  discount: number;
  onRemove: () => void;
}

export default function CartGroupItem({
  categoryName,
  items,
  totalPrice,
  discount,
  onRemove,
}: Props) {
  return (
    <li className="border-b pb-2 text-sm rounded">
      <div className="flex justify-between items-center">
        <p className="font-bold">מבצע מקטגוריית {categoryName}</p>
        <button
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 text-xs"
        >
          הסר
        </button>
      </div>

      <ul className="pl-3 list-disc text-xs mt-1 mb-2">
        {items.map((item) => (
          <li key={item.id}>
            {item.productName} × {item.quantity}
          </li>
        ))}
      </ul>

      <p className="text-sm">סה״כ: {totalPrice.toFixed(2)} ש״ח</p>

      {discount > 0 && (
        <p className="text-green-600 text-xs">
          חסכת: {discount.toFixed(2)} ש״ח
        </p>
      )}
    </li>
  );
}
