"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import Image from "next/image";
import SaleGroupCard from "./ui/sale-group-card";
import ProductSaleGroupMenu from "@/components/cms/entities/sale-group/ui/product-sale-group-menu";

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
type ApiCategoryItems = { items: Item[] };

export default function ViewProducts({ name }: { name: string }) {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const enc = encodeURIComponent(name);
    fetch(`/api/categories/name/${enc}/items`, { cache: "no-store" })
      .then((res) => res.json() as Promise<ApiCategoryItems>)
      .then((data) => setItems(Array.isArray(data.items) ? data.items : []))
      .finally(() => setLoading(false));
  }, [name]);

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

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
              <div
                key={`product-${item.id}`}
                className="group relative border rounded-xl bg-white cursor-pointer"
                onClick={(e) => {
                  // ignore clicks coming from the sale-group button
                  const target = e.target as HTMLElement;
                  if (target.closest?.("[data-sg-menu-button]")) return;
                  if (e.defaultPrevented) return;
                  router.push(`/products/${item.id}`);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/products/${item.id}`);
                  }
                }}
              >
                {/* Dots button for sale groups */}
                <ProductSaleGroupMenu productId={item.id} />

                <div className="content p-4 rounded-xl shadow-md transition-transform transition-shadow duration-150 ease-out group-hover:shadow-xl group-hover:scale-[1.02] origin-top-right flex flex-col items-center">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={120}
                      height={120}
                      className="rounded-xl object-contain w-24 h-24 pointer-events-none"
                    />
                  ) : null}

                  <div className="mt-2 font-bold text-center pointer-events-none">
                    {item.name}
                  </div>
                  <div className="text-gray-700 text-sm text-center pointer-events-none">
                    ₪{Number(item.price).toFixed(2)}
                  </div>
                  {item.sale_price !== null && (
                    <div className="text-green-600 font-semibold text-sm text-center pointer-events-none">
                      מבצע: ₪{Number(item.sale_price).toFixed(2)} (
                      {item.sale_quantity} יח')
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <SaleGroupCard key={`group-${item.id}`} group={item} />
            )
          )}
        </div>
      )}
    </div>
  );
}
