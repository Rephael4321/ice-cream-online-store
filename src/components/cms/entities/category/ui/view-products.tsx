"use client";

import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/cms/ui/input";
import Image from "next/image";
import Link from "next/link";
import SaleGroupCard from "./ui/sale-group-card";

type ProductItem = {
  type: "product";
  id: number;
  name: string;
  image: string | null;
  price: number;
  sale_price: number | null;
  sale_quantity: number | null;
  sort_order: number;
};

type SaleGroupItem = {
  type: "sale_group";
  id: number;
  name: string;
  image: string | null;
  price: number;
  sale_price: number;
  quantity: number;
  sort_order: number;
  products: {
    id: number;
    name: string;
    image: string;
    label: string;
    color: string;
  }[];
};

type Item = ProductItem | SaleGroupItem;

export default function ViewProducts({ name }: { name: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const enc = encodeURIComponent(name);
    fetch(`/api/categories/name/${enc}/items`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  }, [name]);

  const filtered = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  if (loading) return <p>טוען פריטים...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">מוצרים בקטגוריה {name}</h1>
        <Input
          type="text"
          placeholder="חפש מוצר או קבוצה..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 p-4">לא נמצאו תוצאות.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) =>
            item.type === "product" ? (
              <Link
                key={`product-${item.id}`}
                href={`/products/${item.id}`} // product routes still id-based — OK
                className="border p-4 rounded-xl shadow-md bg-white flex flex-col items-center transition hover:shadow-xl hover:scale-[1.02]"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={120}
                    height={120}
                    className="rounded-xl object-contain w-24 h-24"
                  />
                ) : null}
                <div className="mt-2 font-bold text-center">{item.name}</div>
                <div className="text-gray-700 text-sm text-center">
                  ₪{Number(item.price).toFixed(2)}
                </div>
                {item.sale_price !== null && (
                  <div className="text-green-600 font-semibold text-sm text-center">
                    מבצע: ₪{Number(item.sale_price).toFixed(2)} (
                    {item.sale_quantity} יח')
                  </div>
                )}
              </Link>
            ) : (
              <SaleGroupCard key={`group-${item.id}`} group={item} />
            )
          )}
        </div>
      )}
    </div>
  );
}
