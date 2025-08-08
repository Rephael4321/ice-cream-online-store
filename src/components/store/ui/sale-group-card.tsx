"use client";

import { useEffect } from "react";
import Image from "next/image";

type Props = {
  id: number;
  name: string;
  image: string | null;
  quantity: number | null;
  salePrice: number | null;
  price: number | null;
  items: {
    id: number;
    name: string;
    image: string;
    label: string | null;
    color: string | null;
  }[];
};

export default function SaleGroupCard({
  id,
  name,
  image,
  quantity,
  salePrice,
  price,
  items,
}: Props) {
  const fallbackImage = "/sale.png";


  useEffect(() => {
    if (salePrice != null && typeof salePrice !== "number") {
      console.warn("⚠️ salePrice is not a number:", salePrice);
    }

    if (quantity != null && typeof quantity !== "number") {
      console.warn("⚠️ quantity is not a number:", quantity);
    }
  }, [id, name, image, quantity, salePrice, price, items]);

  let saleInfo = null;
  if (
    quantity != null &&
    salePrice != null &&
    typeof quantity === "number" &&
    typeof salePrice === "number"
  ) {
    try {
      saleInfo = (
        <p className="text-sm text-gray-700">
          {quantity} for ₪{salePrice.toFixed(2)}{" "}
          <span className="text-gray-500">
            (₪{(salePrice / quantity).toFixed(2)} each)
          </span>
        </p>
      );
    } catch (err) {
      console.error("❌ Failed to render sale info:", err);
    }
  } else {
    console.warn("⚠️ Missing or invalid sale data:", { quantity, salePrice });
  }

  return (
    <div className="rounded-xl border shadow p-4 w-full bg-green-50 hover:bg-green-100 transition">
      <div className="flex flex-col sm:flex-row gap-4">
        <Image
          src={image || fallbackImage}
          alt={name}
          width={100}
          height={100}
          className="rounded-md object-cover border w-[100px] h-[100px]"
        />

        <div className="flex flex-col justify-between gap-2 flex-1">
          <div>
            <h2 className="text-lg font-bold text-green-700">{name}</h2>
            {saleInfo}
          </div>

          <ul className="mt-2 space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: item.color || "#ccc",
                    minWidth: "0.75rem",
                    minHeight: "0.75rem",
                  }}
                />
                <span className="truncate">{item.name}</span>
                {item.label && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({item.label})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
