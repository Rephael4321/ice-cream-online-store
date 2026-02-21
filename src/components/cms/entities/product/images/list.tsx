"use client";

import { useEffect, useRef, useState } from "react";
import ImageGrid from "./ui/image-grid";
import UploadImage from "@/components/cms/entities/image/upload";
import UploadFolder from "@/components/cms/entities/image/upload-folder";
import { Button } from "@/components/cms/ui/button";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import { apiGet } from "@/lib/api/client";

export type ProductImage = {
  key: string;
  url: string;
  size: number;
  updated_at: string | null;
  name?: string;
};

const PAGE_SIZE = 50;

export default function ProductImagesList() {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const [sort, setSort] = useState<"name" | "updated" | "size">("updated");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [listError, setListError] = useState<string | null>(null);

  const fetchingRef = useRef(false);

  async function fetchBatch(opts: { reset?: boolean } = {}) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const nextOffset = opts.reset ? 0 : offset;

    try {
      const qs = new URLSearchParams({
        sort,
        order,
        offset: String(nextOffset),
        limit: String(PAGE_SIZE),
      });
      const res = await apiGet(`/api/products/unused-images?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      const errMsg =
        data?.listError?.message ||
        (data?.listError && typeof data.listError === "string"
          ? data.listError
          : null);
      if (errMsg) {
        setListError(errMsg);
      } else {
        setListError(null);
      }

      if (opts.reset) {
        setImages(Array.isArray(data.images) ? data.images : []);
      } else {
        setImages((prev) => [
          ...prev,
          ...(Array.isArray(data.images) ? data.images : []),
        ]);
      }

      const got = Array.isArray(data.images) ? data.images.length : 0;
      const newOffset = nextOffset + got;

      setOffset(newOffset);
      setTotal(Number(data.total ?? 0));
      setHasMore(newOffset < Number(data.total ?? 0));
      setLastRefreshed(new Date().toLocaleString("he-IL"));
    } catch (_) {
      setListError("לא ניתן לטעון תמונות.");
      if (opts.reset) setImages([]);
      setOffset(nextOffset);
      setTotal(0);
      setHasMore(false);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setReloading(false);
    }
  }

  // Initial load
  useEffect(() => {
    fetchBatch({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When sort/order changes → reset & refetch
  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    fetchBatch({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, order]);

  if (loading && images.length === 0 && !listError) {
    return <div>טוען תמונות…</div>;
  }

  return (
    <div dir="rtl" className="p-6 space-y-4">
      {/* Shared header title (rendered by the section layout) */}
      <HeaderHydrator title="תמונות לא בשימוש" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* (Title removed; header above) */}
        <div className="flex flex-wrap items-center gap-2 ms-auto">
          {/* Sort controls */}
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

          {/* Refresh */}
          <Button
            variant="outline"
            onClick={() => {
              setReloading(true);
              fetchBatch({ reset: true });
            }}
            className="px-3 py-1.5"
            disabled={reloading}
            title="רענון מהרשת"
          >
            {reloading ? "מרענן…" : "רענן"}
          </Button>

          {lastRefreshed && (
            <span className="text-xs text-gray-500">
              עודכן לאחרונה: {lastRefreshed}
            </span>
          )}
        </div>
      </div>

      {/* Uploaders */}
      <div className="flex flex-col sm:flex-row gap-3">
        <UploadImage onUpload={() => fetchBatch({ reset: true })} />
        <UploadFolder onUpload={() => fetchBatch({ reset: true })} />
      </div>

      {listError && (
        <div
          className="rounded-md border-2 border-amber-400 bg-amber-50 text-amber-900 px-4 py-3 font-medium"
          role="alert"
        >
          {listError}
        </div>
      )}

      {/* Server sorts; grid groups locally for UI only */}
      <ImageGrid images={images} groupBy={sort} order={order} />

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => fetchBatch()}
            className="px-4 py-2"
            disabled={fetchingRef.current}
          >
            טען עוד ({offset}/{total})
          </Button>
        </div>
      )}
    </div>
  );
}
