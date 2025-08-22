"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import Link from "next/link";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  price: number;
  image: string | null;
  created_at: string | null;
  updated_at: string | null;
  in_stock: boolean | null;
  saleQuantity: number | null;
  salePrice: number | null;
  categories: string[] | null;
  image_use_count?: number;
}

type SortKey =
  | "id"
  | "name"
  | "price"
  | "sale"
  | "created_at"
  | "updated_at"
  | "in_stock"
  | "categories";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 48;

export default function ListProduct() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showDuplicatesPanel, setShowDuplicatesPanel] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fetchingRef = useRef(false);

  const updateUrlParam = (q: string) => {
    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  };

  async function fetchBatch(opts: { reset?: boolean } = {}) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const nextOffset = opts.reset ? 0 : offset;

    const qs = new URLSearchParams({
      q: search,
      offset: String(nextOffset),
      limit: String(PAGE_SIZE),
    });
    if (sortKey) {
      qs.set("sort", sortKey);
      qs.set("order", sortOrder);
    }

    try {
      const res = await fetch(`/api/products?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to load products");
      }
      const data = await res.json();
      const list: Product[] = data.products || [];
      const totalFromServer = Number(data.total || 0);

      if (opts.reset) {
        setItems(list);
      } else {
        setItems((prev) => [...prev, ...list]);
      }

      const newOffset = nextOffset + list.length;
      setOffset(newOffset);
      setTotal(totalFromServer);
      setHasMore(newOffset < totalFromServer);
    } catch (e: any) {
      setError(e?.message || "Unexpected error");
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("q") || "";
    setSearch(initialSearch);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBatch({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortKey, sortOrder]);

  const duplicateImageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of items) {
      if (p.image) {
        const count = Math.max(
          p.image_use_count ?? 0,
          (map.get(p.image) ?? 0) + 1
        );
        map.set(p.image, count);
      }
    }
    return map;
  }, [items]);

  const duplicateGroups = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    for (const p of items) {
      if (p.image && (p.image_use_count ?? 0) > 1) {
        if (!groups[p.image]) groups[p.image] = [];
        groups[p.image].push(p);
      }
    }
    return groups;
  }, [items]);

  const hasDuplicates =
    Object.keys(duplicateGroups).length > 0 ||
    items.some((p) => (p.image_use_count ?? 0) > 1);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    updateUrlParam(newValue);
    setOffset(0);
    setHasMore(true);
    setLoading(true);
  };

  const toggleSort = (key: SortKey) => {
    setShowSortMenu(false);
    if (key === sortKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setOffset(0);
    setHasMore(true);
    setLoading(true);
  };

  if (loading && items.length === 0) return <p className="p-4">טוען מוצרים…</p>;
  if (error) return <p className="p-4 text-red-500">שגיאה: {error}</p>;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {hasDuplicates && (
        <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-md shadow flex justify-between items-center">
          <span>⚠️ נמצאו תמונות כפולות בתוצאות המסוננות.</span>
          <button
            onClick={() => setShowDuplicatesPanel((s) => !s)}
            className="text-sm px-3 py-1 bg-yellow-200 rounded hover:bg-yellow-300"
          >
            {showDuplicatesPanel ? "סגור רשימת כפולים" : "הצג כפולים"}
          </button>
        </div>
      )}

      {showDuplicatesPanel && hasDuplicates && (
        <div className="bg-white border rounded-md shadow p-4 space-y-6">
          <h2 className="text-lg font-bold mb-2">מוצרים עם תמונות כפולות</h2>
          {Object.entries(duplicateGroups).map(([image, group]) => (
            <div key={image} className="border rounded p-3 space-y-2">
              <div className="flex items-center gap-3">
                <Image
                  src={image}
                  alt="Duplicate"
                  width={60}
                  height={60}
                  className="rounded object-contain w-14 h-14"
                />
                <span className="text-gray-600">
                  {group.length} פריטים מהדף הנוכחי משתמשים בתמונה זו
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                  >
                    #{p.id} {p.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">רשימת מוצרים</h1>

        <div className="flex items-center gap-3">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="חפש לפי מזהה, שם או מחיר…"
            value={search}
            onChange={handleSearchChange}
            className="max-w-sm"
          />

          <div className="relative">
            <button
              className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => setShowSortMenu((s) => !s)}
            >
              מיון
            </button>

            {showSortMenu && (
              <div className="absolute left-0 z-10 mt-2 bg-white border shadow rounded w-64 p-2 space-y-2 text-sm">
                {(
                  [
                    ["id", "מזהה"],
                    ["name", "שם"],
                    ["price", "מחיר"],
                    ["sale", "מבצע (סה״כ)"],
                    ["created_at", "נוצר בתאריך"],
                    ["updated_at", "עודכן בתאריך"],
                    ["in_stock", "סטוק"],
                    ["categories", "קטגוריה"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center hover:bg-gray-100 px-2 py-1 rounded cursor-pointer"
                  >
                    <span>{label}</span>
                    <button
                      onClick={() => toggleSort(key)}
                      className="text-blue-600 text-xs hover:underline"
                    >
                      {sortKey === key
                        ? sortOrder === "asc"
                          ? "⬆️"
                          : "⬇️"
                        : "מיין"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 p-4">לא נמצאו מוצרים.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => {
            const isDuplicate =
              !!p.image &&
              (p.image_use_count ?? duplicateImageMap.get(p.image) ?? 0) > 1;
            return (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="border p-4 rounded-xl shadow-md bg-white flex flex-col items-center transition hover:shadow-xl hover:scale-[1.02] relative"
              >
                {p.image && (
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={120}
                    height={120}
                    className="rounded-xl object-contain w-24 h-24"
                  />
                )}
                <div className="text-xs text-gray-400 text-center">
                  ID: {p.id}
                </div>
                <div className="mt-1 font-bold text-center">{p.name}</div>
                <div className="text-gray-700 text-sm text-center">
                  ₪{Number(p.price).toFixed(2)}
                </div>
                {p.salePrice != null && p.saleQuantity != null && (
                  <div className="text-green-600 text-sm text-center">
                    מבצע: {p.saleQuantity} ב־ ₪{Number(p.salePrice).toFixed(2)}
                  </div>
                )}
                {p.in_stock === false && (
                  <div className="text-red-600 text-xs mt-1">אזל מהמלאי</div>
                )}
                {isDuplicate && (
                  <div className="absolute top-2 right-2 text-[10px] px-2 py-1 bg-red-600 text-white rounded-full shadow font-bold">
                    🔁 כפול
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={() => {
              setLoadingMore(true);
              fetchBatch();
            }}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            disabled={loadingMore}
          >
            {loadingMore ? "טוען…" : `טען עוד (${offset}/${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
