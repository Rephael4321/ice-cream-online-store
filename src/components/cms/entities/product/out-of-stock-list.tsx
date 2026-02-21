"use client";

import { useEffect, useState } from "react";
import { showToast, Button } from "@/components/cms/ui";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import Image from "next/image";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api/client";

type Product = {
  id: number;
  name: string;
  image: string;
  price: number;
};

export default function OutOfStockList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/api/products/out-of-stock")
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => showToast("שגיאה בטעינת מוצרים", "error"))
      .finally(() => setLoading(false));
  }, []);

  const putBackInStock = async (id: number) => {
    try {
      const res = await apiPatch("/api/products/out-of-stock", {
        productId: id,
        inStock: true,
      });
      if (!res.ok) throw new Error();
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast("המוצר הוחזר למלאי");
    } catch {
      showToast("שגיאה בהחזרת מוצר למלאי", "error");
    }
  };

  return (
    <div dir="rtl" className="p-4 max-w-4xl mx-auto space-y-4">
      {/* Shared header title (rendered by the section layout) */}
      <HeaderHydrator title="מוצרים שאזלו מהמלאי" />

      {loading ? (
        <p className="text-center">טוען...</p>
      ) : products.length === 0 ? (
        <p className="text-center">אין מוצרים חסרים</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product) => (
            <li
              key={product.id}
              className="border p-4 rounded shadow-sm flex flex-col items-center text-center bg-white"
            >
              <Link
                href={`/products/${product.id}`}
                className="hover:opacity-80 w-full"
              >
                <div className="w-full h-40 relative mb-2">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                </div>
                <div className="font-semibold text-lg">{product.name}</div>
                <div className="text-sm text-gray-600">
                  ₪{Number(product.price).toFixed(2)}
                </div>
              </Link>

              <Button
                onClick={() => putBackInStock(product.id)}
                className="mt-3"
              >
                החזר למלאי
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
