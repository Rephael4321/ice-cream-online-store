"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import { SaleGroupEditor } from "./ui/sale-group-editor";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import Image from "next/image";

type SaleGroup = {
  id: number;
  name: string | null;
  quantity: number | string | null;
  sale_price: number | string | null;
  price: number | string | null;
  image: string | null;
  created_at: string;
  updated_at: string;
  categories: { id: number; name: string }[];
  increment_step: number; // NEW
};

type ProductImage = {
  key?: string;
  url: string;
  size?: number;
  updated_at?: string | null;
  name?: string;
};

const PAGE_SIZE = 50;

// helpers
const stripExt = (s: string) => s.replace(/\.[^/.]+$/, "");
const baseName = (urlOrName: string) => {
  if (!urlOrName) return "";
  const file = (urlOrName.split("/").pop() || urlOrName).split("?")[0];
  let decoded = file;
  try {
    decoded = decodeURIComponent(file);
  } catch {}
  return stripExt(decoded);
};

export default function ViewSaleGroup() {
  const { id } = useParams() as { id: string };
  const [group, setGroup] = useState<SaleGroup | null>(null);
  const [loading, setLoading] = useState(true);

  // track images already used by *other* sale groups
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());

  // image save state
  const [savingImage, setSavingImage] = useState(false);

  // camera/device refs
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);

  // modal state
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

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const [res, groupsRes] = await Promise.all([
          fetch(`/api/sale-groups/${id}`),
          fetch(`/api/sale-groups`),
        ]);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setGroup(data);

        const all = await groupsRes.json().catch(() => ({ saleGroups: [] }));
        const used = new Set<string>();
        (Array.isArray(all.saleGroups) ? all.saleGroups : []).forEach(
          (g: { id?: number; image?: string | null }) => {
            if (g?.image && g.id !== Number(id)) used.add(g.image);
          }
        );
        setUsedImages(used);
      } catch {
        showToast("שגיאה בטעינת פרטי הקבוצה", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // -------- image upload + save ----------
  async function saveImage(url: string | null) {
    if (!group) return;
    setSavingImage(true);
    try {
      const res = await fetch(`/api/sale-groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url }),
      });
      if (!res.ok) throw new Error();
      setGroup((prev) => (prev ? { ...prev, image: url } : prev));
      showToast("התמונה עודכנה בהצלחה", "success");
    } catch {
      showToast("שגיאה בעדכון התמונה", "error");
    } finally {
      setSavingImage(false);
    }
  }

  async function uploadSelectedFile(file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/images/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      const url: string =
        data.url || data.Location || data.file?.url || data.image?.url;
      if (!url) throw new Error("Upload succeeded but no URL returned");
      await saveImage(url);
    } catch (e: any) {
      console.error(e);
      showToast(`שגיאה בהעלאת תמונה: ${e.message || e}`, "error");
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

  // -------- app gallery paging ----------
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appGalleryOpen]);

  const filteredImages = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return images;
    return images.filter((i) =>
      (i.name || baseName(i.url)).toLowerCase().includes(q)
    );
  }, [filter, images]);

  const pickFromAppGallery = async (it: ProductImage) => {
    if (!group) return;
    const isBlocked = usedImages.has(it.url) && it.url !== (group.image || "");
    if (isBlocked) return;
    await saveImage(it.url);
    setAppGalleryOpen(false);
  };

  // -------- render ----------
  if (loading) {
    return (
      <main className="p-6" dir="rtl">
        <HeaderHydrator title="עריכת קבוצת מבצע" />
        <p className="text-center mt-8">טוען פרטי קבוצה...</p>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="p-6" dir="rtl">
        <HeaderHydrator title="עריכת קבוצת מבצע" />
        <p className="text-center mt-8 text-red-600">קבוצה לא נמצאה</p>
      </main>
    );
  }

  const previewSrc = group.image || "";

  return (
    <main className="p-6" dir="rtl">
      <HeaderHydrator title="עריכת קבוצת מבצע" />

      <div className="max-w-5xl mx-auto mt-6 flex flex-col md:flex-row gap-6 items-start relative">
        {savingImage && (
          <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center rounded-md">
            <span className="text-xl font-semibold">שומר תמונה...</span>
          </div>
        )}

        {/* LEFT — fields/editor */}
        <div className="w-full md:w-1/2">
          <SaleGroupEditor
            id={group.id}
            initialName={group.name}
            initialQuantity={
              group.quantity !== null ? Number(group.quantity) : null
            }
            initialSalePrice={
              group.sale_price !== null ? Number(group.sale_price) : null
            }
            initialPrice={group.price !== null ? Number(group.price) : null}
            initialImage={group.image}
            initialCategories={group.categories || []}
            initialIncrementStep={group.increment_step || 1} // NEW
          />
        </div>

        {/* RIGHT — image preview + four buttons + modal */}
        <aside className="w-full md:w-1/2 space-y-4">
          <div className="relative w-full h-80 border rounded-md bg-white">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1) Camera */}
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={savingImage}
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
              disabled={savingImage}
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
                    group.name || "ice cream"
                  )}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              disabled={savingImage}
              className="w-full"
              title="חפש בגוגל תמונות"
            >
              🔎 Google
            </Button>

            {/* 4) App gallery (modal) */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setAppGalleryOpen(true)}
              disabled={savingImage}
              className="w-full"
              title="פתח ספריית תמונות מהאפליקציה"
            >
              📁 ספריית אפליקציה
            </Button>
          </div>
        </aside>
      </div>

      {/* ---- APP GALLERY MODAL ---- */}
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
                  const name = it.name || baseName(it.url);
                  const isActive = group.image === it.url;
                  const isBlocked =
                    usedImages.has(it.url) && it.url !== (group.image || "");
                  return (
                    <button
                      key={it.url}
                      type="button"
                      onClick={() => !isBlocked && pickFromAppGallery(it)}
                      className={`relative w-full h-28 border rounded overflow-hidden ${
                        isActive
                          ? "ring-2 ring-emerald-500"
                          : isBlocked
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:ring-2 hover:ring-blue-400"
                      }`}
                      title={
                        isBlocked
                          ? "תמונה זו כבר בשימוש בקבוצת מבצע אחרת"
                          : name
                      }
                      disabled={isBlocked}
                    >
                      <Image
                        src={it.url}
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
    </main>
  );
}
