"use client";

import { useState } from "react";
import Image from "next/image";

type Item = {
  id: number;
  name: string;
  image?: string | null;
  label: string | null;
  color: string | null;
};

type Props = {
  id: number;
  name: string;
  image: string | null;
  price: number | null; // single-unit price
  quantity: number | null; // bundle size (e.g., 3)
  salePrice: number | null; // bundle price (e.g., 8.90)
  items: Item[];
};

export default function SaleGroupCard({
  id,
  name,
  image,
  price,
  quantity,
  salePrice,
  items,
}: Props) {
  const [counts, setCounts] = useState<Record<number, number>>({});

  const fallbackImage = "/sale.png";
  const q = Number(quantity ?? 0);
  const sp = Number(salePrice ?? 0);
  const perUnitOnSale = q > 0 ? sp / q : null;

  const inc = (productId: number, delta = 1) =>
    setCounts((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  const dec = (productId: number, delta = 1) => inc(productId, -delta);

  return (
    <div
      dir="rtl"
      className="w-full bg-white rounded-xl shadow-md p-4"
      data-sale-group-id={id}
    >
      {/* Image (same fixed size as SingleProduct) */}
      <div className="relative w-20 h-20 mx-auto mb-3">
        <Image
          src={image || fallbackImage}
          alt={name}
          fill
          className="object-contain rounded-md"
        />
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-bl-md shadow">
          מבצע!
        </div>
      </div>

      {/* Name */}
      <h2 className="text-center text-base font-bold text-gray-800">{name}</h2>

      {/* Single price */}
      <div className="mt-1 text-center text-sm text-gray-700">
        {typeof price === "number" ? (
          <div className="line-through text-red-500">
            {price.toFixed(2)} ש״ח
          </div>
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </div>

      {/* Sale bundle */}
      <div className="text-center text-sm text-gray-700">
        <div className="text-green-600 font-bold">
          {q} ב- {sp.toFixed(2)} ש״ח
        </div>
      </div>

      {/* Products (color + label only) with amount controls) */}
      <div className="mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((it) => {
            const c = counts[it.id] || 0;
            return (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-xl border p-2"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: it.color || "#ccc" }}
                    title={it.name}
                  />
                  <span className="text-sm text-gray-800 truncate">
                    {it.label || it.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dec(it.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-500 text-lg"
                    aria-label="הפחת פריט"
                  >
                    –
                  </button>
                  <span className="w-6 text-center font-semibold">{c}</span>
                  <button
                    onClick={() => inc(it.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:border-gray-500 text-lg"
                    aria-label="הוסף פריט"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-2 text-xs text-gray-500 text-center sm:text-right">
          * המבצע מחושב על סך כל הפריטים בקבוצה.
        </div>
      </div>
    </div>
  );
}
