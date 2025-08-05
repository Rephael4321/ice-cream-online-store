"use client";

import Link from "next/link";
import Image from "next/image";

interface SaleGroupCardProps {
  id: number;
  name: string | null;
  image?: string | null;
  quantity: number | null;
  salePrice: number | null;
}

export function SaleGroupCard({
  id,
  name,
  image,
  quantity,
  salePrice,
}: SaleGroupCardProps) {
  return (
    <Link
      href={`/sale-groups/${id}`}
      className="border p-4 rounded-xl shadow-md bg-white flex flex-col items-center transition hover:shadow-xl hover:scale-[1.02] relative"
    >
      {image && (
        <Image
          src={image}
          alt={name || "Sale Group"}
          width={120}
          height={120}
          className="rounded-xl object-contain w-24 h-24"
        />
      )}

      <div className="text-xs text-gray-400 text-center">ID: {id}</div>

      <div className="mt-1 font-bold text-center">{name || "קבוצה ללא שם"}</div>

      <div className="text-sm text-gray-700 text-center">
        {quantity && salePrice
          ? `${quantity} ב־₪${Number(salePrice).toFixed(2)}`
          : "פרטי מבצע לא הוגדרו"}
      </div>
    </Link>
  );
}
