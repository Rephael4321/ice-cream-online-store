"use client";

import { useEffect, useState } from "react";
import ImageGrid from "./ui/image-grid";

export type ProductImage = {
  key: string;
  url: string;
  size: number;
  updated_at: string | null;
  name?: string; // display name (if API provides it)
};

export default function ProductImagesList() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [sort, setSort] = useState<"name" | "updated" | "size">("updated");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  async function fetchImages() {
    try {
      const res = await fetch(`/api/products/unused-images`, {
        cache: "no-store",
      });
      const data = await res.json();
      setImages(data.images || []);
      setLastRefreshed(new Date().toLocaleString("he-IL"));
    } finally {
      setLoading(false);
      setReloading(false);
    }
  }

  // Initial load
  useEffect(() => {
    fetchImages();
    // NOTE: no dependency on sort/order → no refetch on organize
  }, []);

  if (loading) return <div>טוען תמונות…</div>;

  return (
    <div dir="rtl" className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">תמונות לא בשימוש</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sorting Controls (organize locally only) */}
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="border px-2 py-1 rounded"
              title="שיטת קיבוץ/מיון"
            >
              <option value="updated">לפי עדכון אחרון</option>
              <option value="name">לפי שם</option>
              <option value="size">לפי גודל</option>
            </select>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as any)}
              className="border px-2 py-1 rounded"
              title="סדר"
            >
              <option value="desc">יורד</option>
              <option value="asc">עולה</option>
            </select>
          </div>

          {/* Reload button */}
          <button
            onClick={() => {
              setReloading(true);
              fetchImages();
            }}
            className={`px-3 py-1.5 rounded border ${
              reloading ? "opacity-70 cursor-wait" : "hover:bg-gray-50"
            }`}
            disabled={reloading}
            title="רענון מהרשת"
          >
            {reloading ? "מרענן…" : "רענן"}
          </button>

          {/* Last refreshed hint */}
          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              עודכן לאחרונה: {lastRefreshed}
            </span>
          )}
        </div>
      </div>

      {/* Organize client-side */}
      <ImageGrid images={images} groupBy={sort} order={order} />
    </div>
  );
}
