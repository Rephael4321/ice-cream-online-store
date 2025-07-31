"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { showToast } from "@/components/cms/ui/toast";

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
    fetch("/api/products/out-of-stock")
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => showToast("שגיאה בטעינת מוצרים", "error"))
      .finally(() => setLoading(false));
  }, []);

  const putBackInStock = async (id: number) => {
    try {
      const res = await fetch("/api/products/out-of-stock", {
        method: "PATCH",
        body: JSON.stringify({ productId: id, inStock: true }),
        headers: { "Content-Type": "application/json" },
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
      <h1 className="text-2xl font-bold text-center">מוצרים שאזלו מהמלאי</h1>
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
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-40 object-contain mb-2"
                />
                <div className="font-semibold text-lg">{product.name}</div>
                <div className="text-sm text-gray-600">₪{product.price}</div>
              </Link>
              <button
                onClick={() => putBackInStock(product.id)}
                className="mt-3 bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded"
              >
                החזר למלאי
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
