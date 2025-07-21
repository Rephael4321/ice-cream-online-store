"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/cms/ui/input";
import { useRouter, useSearchParams } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: string | number;
  image?: string;
  saleQuantity?: number | string;
  salePrice?: string | number;
}

export default function ListProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const router = useRouter();

  // Fill search from URL on first load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("q") || "";
    setSearch(initialSearch);
  }, []);
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

  const duplicateImageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.image) {
        map.set(p.image, (map.get(p.image) ?? 0) + 1);
      }
    }
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toString().includes(search)
    );
  }, [products, search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    const params = new URLSearchParams(window.location.search);
    if (newValue) {
      params.set("q", newValue);
    } else {
      params.delete("q");
    }
    router.replace(`?${params.toString()}`);
  };

  if (loading) return <p className="p-4">טוען מוצרים...</p>;
  if (error) return <p className="p-4 text-red-500">שגיאה: {error}</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">רשימת מוצרים</h1>
        <Input
          type="text"
          placeholder="חפש מוצר לפי שם או מספר..."
          value={search}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 p-4">לא נמצאו מוצרים.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => {
            const isDuplicate =
              !!product.image &&
              (duplicateImageMap.get(product.image) ?? 0) > 1;

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="border p-4 rounded-xl shadow-md bg-white flex flex-col items-center transition hover:shadow-xl hover:scale-[1.02] relative"
              >
                {product.image && (
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={120}
                    height={120}
                    className="rounded-xl object-contain w-24 h-24"
                  />
                )}
                <div className="text-xs text-gray-400 text-center">
                  ID: {product.id}
                </div>
                <div className="mt-1 font-bold text-center">{product.name}</div>
                <div className="text-gray-700 text-sm text-center">
                  ₪{Number(product.price).toFixed(2)}
                </div>
                {product.salePrice && product.saleQuantity && (
                  <div className="text-green-600 text-sm text-center">
                    מבצע: {product.saleQuantity} ב־ ₪
                    {Number(product.salePrice).toFixed(2)}
                  </div>
                )}
                {isDuplicate && (
                  <div className="absolute top-2 right-2 text-xs px-2 py-1 bg-red-500 text-white rounded-full shadow">
                    🔁 כפול
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
