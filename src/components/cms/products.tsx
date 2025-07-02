"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: string | number;
  image?: string;
  saleQuantity?: number | string;
  salePrice?: string | number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("ארעה תקלה בטעינת מוצרים");
        const data = await res.json();
        setProducts((data.products ?? data).reverse());
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  if (loading) return <p>טוען מוצרים...</p>;
  if (error) return <p>שגיאה: {error}</p>;
  if (products.length === 0) return <p>הרשימה ריקה כרגע.</p>;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-center">רשימת מוצרים</h1>
      <ul className="space-y-4">
        {products.map(({ id, name, price, image, saleQuantity, salePrice }) => {
          const numericPrice = Number(price);
          const numericSaleQuantity = saleQuantity
            ? Number(saleQuantity)
            : null;
          const numericSalePrice = salePrice ? Number(salePrice) : null;

          return (
            <li key={id} className="border rounded p-4 flex gap-4 items-center">
              <Link
                href={`/products/${id}`}
                className="flex items-center gap-4 w-full cursor-pointer"
              >
                {image && (
                  <img
                    src={image}
                    alt={name}
                    className="w-20 h-20 object-contain rounded"
                  />
                )}
                <div>
                  <h2 className="text-lg font-semibold">{name}</h2>
                  <p>
                    מחיר: ₪
                    {isNaN(numericPrice) ? "N/A" : numericPrice.toFixed(2)}
                  </p>
                  {numericSaleQuantity && numericSalePrice && (
                    <p>
                      מבצע: {numericSaleQuantity} ב- ₪
                      {numericSalePrice.toFixed(2)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
