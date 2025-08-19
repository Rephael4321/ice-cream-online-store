"use client";

import { useEffect, useState } from "react";
import ImageGrid from "./ui/image-grid";

export type ProductImage = {
  key: string;
  url: string;
  size: number;
  updated_at: string | null;
  name?: string; // ✅ display name from index
};

export default function ProductImagesList() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"name" | "updated" | "size">("updated");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/unused-images?sort=${sort}&order=${order}`)
      .then((res) => res.json())
      .then((data) => {
        setImages(data.images || []);
        setLoading(false);
      });
  }, [sort, order]);

  if (loading) return <div>טוען תמונות…</div>;

  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">תמונות לא בשימוש</h1>

      {/* Sorting Controls */}
      <div className="flex gap-4 mb-6">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="border px-2 py-1 rounded"
        >
          <option value="updated">לפי עדכון אחרון</option>
          <option value="name">לפי שם</option>
          <option value="size">לפי גודל</option>
        </select>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value as any)}
          className="border px-2 py-1 rounded"
        >
          <option value="desc">יורד</option>
          <option value="asc">עולה</option>
        </select>
      </div>

      {/* ✅ Pass grouping hint */}
      <ImageGrid images={images} groupBy={sort} order={order} />
    </div>
  );
}
