"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import Image from "next/image";
import SaleGroupCard from "./ui/sale-group-card";
import ProductSaleGroupMenu from "@/components/cms/entities/sale-group/ui/product-sale-group-menu";
import { apiGet } from "@/lib/api/client";

type ProductItem = {
  type: "product";
  id: number;
  name: string;
  image: string | null;
  price: number;
  sale_price: number | null;
  sale_quantity: number | null;
  sort_order: number;
  group: {
    id: number;
    name: string | null;
    price: number | null;
    sale_price: number | null;
    quantity: number | null;
  } | null;
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
    apiGet(`/api/categories/name/${enc}/items`, { cache: "no-store" })
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

  // helper to patch a product's group locally after a menu change
  function setProductGroup(productId: number, group: ProductItem["group"]) {
    setItems((prev) =>
      prev.map((it) =>
        it.type === "product" && it.id === productId ? { ...it, group } : it
      )
    );
  }

  /**
   * Adjacency analysis (unchanged)
   */
  const adjacency = useMemo(() => {
    const result = {
      issues: [] as Array<{
        groupId: number;
        name: string | null;
        blocks: Array<{ start: number; end: number }>; // 1-based positions
        count: number;
      }>,
      fragmentedGroupIds: new Set<number>(),
    };

    if (search.trim().length > 0) return result;

    const seq: Array<{
      idx: number;
      productId: number;
      groupId: number;
      groupName: string | null;
    }> = [];

    filtered.forEach((item, idx) => {
      if (item.type !== "product") return;
      const g = item.group;
      if (!g?.id) return;
      seq.push({
        idx,
        productId: item.id,
        groupId: g.id,
        groupName: g.name ?? null,
      });
    });

    if (seq.length === 0) return result;

    type Block = { start: number; end: number };
    const blocks = new Map<number, { name: string | null; blocks: Block[] }>();

    let i = 0;
    while (i < seq.length) {
      const currentGroup = seq[i].groupId;
      const name = seq[i].groupName ?? null;

      let start = seq[i].idx + 1;
      let end = start;

      let j = i + 1;
      while (
        j < seq.length &&
        seq[j].groupId === currentGroup &&
        seq[j].idx === seq[j - 1].idx + 1
      ) {
        end = seq[j].idx + 1;
        j++;
      }

      if (!blocks.has(currentGroup)) {
        blocks.set(currentGroup, { name, blocks: [] });
      }
      blocks.get(currentGroup)!.blocks.push({ start, end });

      i = j;
    }

    for (const [groupId, info] of blocks.entries()) {
      if (info.blocks.length > 1) {
        result.fragmentedGroupIds.add(groupId);
        result.issues.push({
          groupId,
          name: info.name,
          blocks: info.blocks,
          count: info.blocks.length,
        });
      }
    }

    result.issues.sort((a, b) => {
      const an = a.name ?? `#${a.groupId}`;
      const bn = b.name ?? `#${b.groupId}`;
      return an.localeCompare(bn, "he");
    });

    return result;
  }, [filtered, search]);

  if (loading) return <p>טוען פריטים...</p>;

  return (
    <div className="space-y-6">
      {/* Only the search input here (no inner title) */}
      <div className="flex justify-end items-center gap-4 flex-wrap">
        <Input
          type="text"
          placeholder="חפש מוצר או קבוצה..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Fragmentation banner */}
      {adjacency.issues.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
          <div className="font-semibold mb-1">
            ⚠️ סידור לא רציף של קבוצות מבצע
          </div>
          <ul className="text-sm list-disc ms-5 space-y-1">
            {adjacency.issues.map((iss) => (
              <li key={iss.groupId}>
                קבוצת <strong>{iss.name || `#${iss.groupId}`}</strong> מפוזרת ל־
                <strong>{iss.count}</strong> בלוקים:&nbsp;
                {iss.blocks
                  .map((b) =>
                    b.start === b.end ? `#${b.start}` : `#${b.start}–#${b.end}`
                  )
                  .join(", ")}
                . מומלץ לעדכן את <code>sort_order</code> כדי להצמיד אותם.
              </li>
            ))}
          </ul>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-gray-500 p-4">לא נמצאו תוצאות.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) =>
            item.type === "product" ? (
              <div
                key={`product-${item.id}`}
                className={`group relative border rounded-xl bg-white cursor-pointer transition-shadow ${
                  item.group?.id &&
                  adjacency.fragmentedGroupIds.has(item.group.id)
                    ? "ring-2 ring-red-300"
                    : ""
                }`}
                onClick={(e) => {
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
                title={
                  item.group?.id &&
                  adjacency.fragmentedGroupIds.has(item.group.id)
                    ? "קבוצת מבצע זו אינה רציפה ברשימה"
                    : undefined
                }
              >
                {/* Dots button for sale groups */}
                <ProductSaleGroupMenu
                  productId={item.id}
                  initialGroupId={item.group?.id ?? null}
                  onChange={(newGroupId, meta) => {
                    setProductGroup(
                      item.id,
                      newGroupId
                        ? {
                            id: newGroupId,
                            name: meta?.name ?? null,
                            price: meta?.price ?? null,
                            sale_price: meta?.sale_price ?? null,
                            quantity: meta?.quantity ?? null,
                          }
                        : null
                    );
                  }}
                />

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

                  {item.group && (
                    <div
                      className={`mt-2 text-xs px-2 py-1 rounded-full border pointer-events-none ${
                        item.group.id &&
                        adjacency.fragmentedGroupIds.has(item.group.id)
                          ? "bg-red-50 text-red-700 border-red-300"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                      title={`קבוצת מבצע #${item.group.id}${
                        item.group.name ? ` • ${item.group.name}` : ""
                      }`}
                    >
                      בקבוצת מבצע: {item.group.name || `#${item.group.id}`}
                      {item.group.id &&
                        adjacency.fragmentedGroupIds.has(item.group.id) && (
                          <span className="ms-1">• לא רציף</span>
                        )}
                    </div>
                  )}

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
