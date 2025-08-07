"use client";

import Image from "next/image";

type ProductInGroup = {
  id: number;
  name: string;
  image: string;
  label: string;
  color: string;
};

type SaleGroupCardProps = {
  group: {
    id: number;
    name: string;
    image: string | null;
    price: number;
    sale_price: number;
    quantity: number;
    products: ProductInGroup[];
  };
};

export default function SaleGroupCard({
  group,
}: {
  group: SaleGroupCardProps["group"];
}) {
  const { name, image, price, sale_price, quantity, products } = group;

  return (
    <div className="border p-4 rounded-xl shadow-md bg-white w-full max-w-md mx-auto space-y-4">
      {/* Title and Sale Info */}
      <div className="flex justify-between items-center">
        <div className="font-bold text-lg">{name}</div>
        <div className="text-sm text-green-600 font-semibold">
          מבצע: {quantity} ב־₪{sale_price.toFixed(2)}
        </div>
      </div>

      {/* Group Image */}
      {image ? (
        <Image
          src={image}
          alt={name}
          width={96}
          height={96}
          className="rounded-xl object-contain w-24 h-24 mx-auto"
        />
      ) : null}

      {/* Base Price Info */}
      <div className="text-sm text-gray-600 text-center">
        מחיר יחידה: ₪{price.toFixed(2)}
      </div>

      {/* Product Labels */}
      <div className="flex flex-wrap justify-center gap-2">
        {products.map((product) => (
          <div
            key={product.id}
            className="text-xs rounded px-3 py-1 text-white font-medium"
            style={{ backgroundColor: product.color || "#888" }}
          >
            {product.label || "ללא תיאור"}
          </div>
        ))}
      </div>
    </div>
  );
}
