"use client";

import Link from "next/link";

interface SaleGroupCardProps {
  id: number;
  name: string | null;
  quantity: number | null;
  salePrice: number | null;
}

export function SaleGroupCard({
  id,
  name,
  quantity,
  salePrice,
}: SaleGroupCardProps) {
  return (
    <Link
      href={`/sale-groups/${id}`}
      className="block border rounded-xl p-4 shadow-sm hover:shadow-md transition bg-white"
    >
      <h3 className="text-lg font-semibold text-purple-700 mb-1">
        {name || "קבוצה ללא שם"}
      </h3>

      <p className="text-sm text-gray-700">
        {quantity && salePrice
          ? `${quantity} ב־₪${salePrice}`
          : "פרטי מבצע לא הוגדרו"}
      </p>
    </Link>
  );
}
