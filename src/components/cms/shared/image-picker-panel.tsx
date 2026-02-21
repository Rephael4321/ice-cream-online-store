"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import Image from "next/image";
import { api, apiGet } from "@/lib/api/client";

type ProductImage = {
  key?: string;
  url: string;
  size?: number;
  updated_at?: string | null;
  name?: string;
};

export const PAGE_SIZE = 50;

// ---- helpers (export baseName so parent can reuse)
export const stripExt = (s: string) => s.replace(/\.[^/.]+$/, "");
export const baseName = (urlOrName: string) => {
  if (!urlOrName) return "";
  const file = (urlOrName.split("/").pop() || urlOrName).split("?")[0];
  let decoded = file;
  try {
    decoded = decodeURIComponent(file);
  } catch {}
  return stripExt(decoded);
};

type Props = {
  value: string; // image url
  onChange: (url: string) => void;
  disabled?: boolean;
  googleQuery?: string;
  previewClassName?: string;
  /** URLs that must be disabled/blocked from selection (e.g., already used by sale groups) */
  blocklist?: string[] | Set<string>;
};

export default function ImagePickerPanel({
  value,
  onChange,
  disabled = false,
  googleQuery = "ice cream",
  previewClassName = "relative w-full h-80 border rounded-md bg-white",
  blocklist,
}: Props) {
  // camera/device upload
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadSelectedFile(file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api("/api/images/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Upload failed");
      }

      const data = await res.json();

      // 1) Try common response shapes (including our updated API)
      let url: string | undefined =
        data?.url ??
        data?.Location ??
        data?.file?.url ??
        data?.image?.url ??
        data?.result?.url ??
        data?.results?.[0]?.url;

      // 2) If no URL yet, try to derive it from a key by constructing the full S3 URL and wrapping it in /api/img-proxy?url=
      const key: string | undefined =
        data?.key ??
        data?.Key ??
        data?.file?.key ??
        data?.image?.key ??
        data?.result?.key ??
        data?.results?.[0]?.key;

      if (!url && key) {
        const bucket = process.env.NEXT_PUBLIC_MEDIA_BUCKET; // e.g. "yaniv-ice-cream-online-store"
        if (bucket) {
          const s3 = `https://${bucket}.s3.amazonaws.com/${key.replace(
            /^\/+/,
            ""
          )}`;
          url = `/api/img-proxy?url=${encodeURIComponent(s3)}`;
        }
        // If bucket isn't exposed client-side, rely on API to always return url.
      }

      if (!url) {
        console.error("Upload response without URL:", data);
        throw new Error("Upload succeeded but no URL returned");
      }

      onChange(url);
      showToast("התמונה הועלתה בהצלחה", "success");
    } catch (e: any) {
      console.error(e);
      showToast(`שגיאה בהעלאת תמונה: ${e?.message || e}`, "error");
    }
  }

  const onCameraPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (file) uploadSelectedFile(file);
  };
  const onDevicePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (file) uploadSelectedFile(file);
  };

  // ---- App Gallery modal
  const [appGalleryOpen, setAppGalleryOpen] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loadingImgs, setLoadingImgs] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [sort, setSort] = useState<"name" | "updated" | "size">("updated");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState("");

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
      setLoadingImgs(false);
      setReloading(false);
    }
  }

  useEffect(() => {
    if (appGalleryOpen && images.length === 0 && !loadingImgs) {
      setLoadingImgs(true);
      setOffset(0);
      setHasMore(true);
      fetchBatch({ reset: true });
    }
  }, [appGalleryOpen, images.length, loadingImgs]);

  const filteredImages = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return images;
    return images.filter((i) =>
      (i.name || baseName(i.url)).toLowerCase().includes(q)
    );
  }, [filter, images]);

  const blockedSet = useMemo(
    () => (blocklist ? new Set(blocklist) : new Set<string>()),
    [blocklist]
  );

  const pickFromAppGallery = (it: ProductImage) => {
    if (blockedSet.has(it.url)) return;
    onChange(it.url);
    setAppGalleryOpen(false);
  };

  const previewSrc = value || "";

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className={previewClassName}>
        {previewSrc ? (
          <Image
            src={previewSrc}
            alt="תצוגה מקדימה"
            fill
            className="object-contain rounded-md"
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-400">
            אין תמונה נבחרת
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 1) Camera */}
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="w-full"
          title="צלם והעלה"
        >
          📸 צילום
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onCameraPick}
        />

        {/* 2) Device gallery */}
        <Button
          type="button"
          variant="outline"
          onClick={() => deviceInputRef.current?.click()}
          disabled={disabled}
          className="w-full"
          title="בחר מהגלריה (מהמכשיר)"
        >
          🖼️ גלריה
        </Button>
        <input
          ref={deviceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onDevicePick}
        />

        {/* 3) Google Images */}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            window.open(
              `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
                googleQuery || "ice cream"
              )}`,
              "_blank",
              "noopener,noreferrer"
            )
          }
          disabled={disabled}
          className="w-full"
          title="חפש בגוגל תמונות"
        >
          🔎 Google
        </Button>

        {/* 4) App gallery */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setAppGalleryOpen(true)}
          disabled={disabled}
          className="w-full"
          title="פתח ספריית תמונות מהאפליקציה"
        >
          📁 ספריית אפליקציה
        </Button>
      </div>

      {/* Modal */}
      {appGalleryOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAppGalleryOpen(false)}
          />
          <div className="absolute inset-x-0 top-12 mx-auto max-w-5xl bg-white rounded-lg shadow-lg border p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-semibold">ספריית האפליקציה</h2>
              <div className="flex items-center gap-2">
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
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
                    setOffset(0);
                    setHasMore(true);
                    setLoadingImgs(true);
                    fetchBatch({ reset: true });
                  }}
                  disabled={reloading}
                >
                  {reloading ? "מרענן…" : "רענן"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAppGalleryOpen(false)}
                >
                  סגור
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[65vh] overflow-auto pr-1">
              {loadingImgs && images.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-8">
                  טוען…
                </div>
              )}
              {images.length > 0 &&
                (filteredImages.length > 0 ? filteredImages : []).map((it) => {
                  const nameLabel = it.name || baseName(it.url);
                  const isActive = value === it.url;
                  const isBlocked = blockedSet.has(it.url);
                  return (
                    <button
                      key={it.url}
                      type="button"
                      onClick={() => !isBlocked && pickFromAppGallery(it)}
                      className={`relative w-full h-28 border rounded overflow-hidden ${
                        isBlocked
                          ? "opacity-50 cursor-not-allowed"
                          : isActive
                          ? "ring-2 ring-emerald-500"
                          : "hover:ring-2 hover:ring-blue-400"
                      }`}
                      title={nameLabel}
                      disabled={isBlocked}
                    >
                      <Image
                        src={it.url}
                        alt={nameLabel}
                        fill
                        className="object-contain bg-white"
                        unoptimized
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-white/80 text-[10px] px-1 py-0.5 truncate">
                        {nameLabel}
                        {isBlocked ? " — בשימוש" : ""}
                      </div>
                    </button>
                  );
                })}

              {!loadingImgs &&
                images.length > 0 &&
                filteredImages.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    אין תוצאות תואמות
                  </div>
                )}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-3">
                <Button onClick={() => fetchBatch()} disabled={loadingImgs}>
                  טען עוד ({offset}/{total})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
