"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Product = {
  id: number;
  name: string;
  image: string;
  price: number | string;
  sale_price: number | string | null;
  sale_quantity: number | null;
};

export default function ViewProducts({ id }: { id: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/categories/${id}/products`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setProducts(data.products))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>טוען מוצרים...</p>;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/products/${product.id}`}
          className="border p-4 rounded-xl shadow-md bg-white flex flex-col items-center transition hover:shadow-xl hover:scale-[1.02]"
        >
          <Image
            src={product.image}
            alt={product.name}
            width={120}
            height={120}
            className="rounded-xl object-contain w-24 h-24"
          />
          <div className="mt-2 font-bold">{product.name}</div>
          <div className="text-gray-700">
            ₪{Number(product.price).toFixed(2)}
            {product.sale_price !== null && (
              <div className="text-green-600 font-semibold text-sm">
                מבצע: ₪{Number(product.sale_price).toFixed(2)} (
                {product.sale_quantity} יח')
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
