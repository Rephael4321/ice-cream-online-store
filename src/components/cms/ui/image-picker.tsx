"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/cms/ui/input";
import { Label } from "@/components/cms/ui/label";
import { Button } from "@/components/cms/ui/button";
import UploadImage from "@/components/cms/entities/image/upload";
import UploadFolder from "@/components/cms/entities/image/upload-folder";

type ProductImage = {
  key: string;
  url: string;
  size: number;
  updated_at: string | null;
  name?: string;
};

type Props = {
  value?: string; // currently picked URL
  onPick: (img: { url: string; name: string }) => void;
  disabled?: boolean;
  title?: string;
};

const PAGE_SIZE = 50;

export default function InlineImageGalleryPicker({
  value,
  onPick,
  disabled = false,
  title = "גלריה",
}: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const [sort, setSort] = useState<"name" | "updated" | "size">("updated");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [q, setQ] = useState("");
  const fetchingRef = useRef(false);

  // ---------- data
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
      // NOTE: endpoint returns UNUSED images → duplicates prevented by design
      const res = await fetch(`/api/products/unused-images?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();

      const next = (data.images || []) as ProductImage[];
      if (opts.reset) setImages(next);
      else setImages((prev) => [...prev, ...next]);

      const got = Array.isArray(next) ? next.length : 0;
      const newOffset = nextOffset + got;
      setOffset(newOffset);
      setTotal(Number(data.total || 0));
      setHasMore(newOffset < Number(data.total || 0));
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setReloading(false);
    }
  }

  useEffect(() => {
    fetchBatch({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    setHasMore(true);
    fetchBatch({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, order]);

  // ---------- utils
  const stripExt = (s: string) => s.replace(/\.[^/.]+$/, "");
  const baseName = (u: string) => {
    if (!u) return "";
    const raw = (u.split("/").pop() || u).split("?")[0];
    try {
      return stripExt(decodeURIComponent(raw));
    } catch {
      return stripExt(raw);
    }
  };

  // fast bar (first 10 from current dataset; filtered if q present)
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return images;
    return images.filter((im) =>
      (im.name || baseName(im.url)).toLowerCase().includes(query)
    );
  }, [q, images]);

  const quick = useMemo(() => filtered.slice(0, 10), [filtered]);

  // ---------- ui
  if (loading && images.length === 0) {
    return <div className="rounded-md border p-3">טוען גלריה…</div>;
  }

  return (
    <div className="space-y-3">
      {/* header + search + sort + uploaders */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="font-medium">{title}</Label>
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="סינון לפי שם…"
              className="h-8 w-48"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="border px-2 py-1 rounded h-8"
              title="מיון"
            >
              <option value="updated">עדכון אחרון</option>
              <option value="name">שם</option>
              <option value="size">גודל</option>
            </select>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as any)}
              className="border px-2 py-1 rounded h-8"
              title="סדר"
            >
              <option value="desc">יורד</option>
              <option value="asc">עולה</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReloading(true);
                fetchBatch({ reset: true });
              }}
              disabled={reloading}
            >
              {reloading ? "מרענן…" : "רענן"}
            </Button>
          </div>
        </div>

        {/* uploaders (optional, handy while picking) */}
        <div className="flex flex-col sm:flex-row gap-2">
          <UploadImage onUpload={() => fetchBatch({ reset: true })} />
          <UploadFolder onUpload={() => fetchBatch({ reset: true })} />
        </div>
      </div>

      {/* FAST BAR */}
      <div className="rounded-md border p-2">
        <div className="text-xs text-gray-600 mb-2">בחירה מהירה</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quick.length === 0 && (
            <span className="text-xs text-gray-400">אין תוצאות תואמות</span>
          )}
          {quick.map((im) => {
            const name = im.name || baseName(im.url);
            const active = value === im.url;
            return (
              <button
                key={im.url}
                type="button"
                title={name}
                onClick={() => onPick({ url: im.url, name })}
                disabled={disabled}
                className={`relative shrink-0 w-16 h-16 border rounded ${
                  active
                    ? "ring-2 ring-emerald-500"
                    : "hover:ring-2 hover:ring-blue-400"
                }`}
              >
                <Image
                  src={im.url}
                  alt={name}
                  fill
                  className="object-contain rounded bg-white"
                  unoptimized
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* FULL GRID (same dataset) */}
      <div className="rounded-md border p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((im) => {
            const name = im.name || baseName(im.url);
            const active = value === im.url;
            return (
              <button
                key={im.url}
                type="button"
                onClick={() => onPick({ url: im.url, name })}
                disabled={disabled}
                className={`relative w-full h-28 border rounded overflow-hidden ${
                  active
                    ? "ring-2 ring-emerald-500"
                    : "hover:ring-2 hover:ring-blue-400"
                }`}
                title={name}
              >
                <Image
                  src={im.url}
                  alt={name}
                  fill
                  className="object-contain bg-white"
                  unoptimized
                />
                <div className="absolute bottom-0 left-0 right-0 bg-white/80 text-[10px] px-1 py-0.5 truncate">
                  {name}
                </div>
              </button>
            );
          })}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-3">
            <Button
              onClick={() => fetchBatch()}
              disabled={disabled}
              className="min-w-[160px]"
            >
              טען עוד ({offset}/{total})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
