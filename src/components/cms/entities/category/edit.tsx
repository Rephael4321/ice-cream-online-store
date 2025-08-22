"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Label } from "@/components/cms/ui/label";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import Image from "next/image";

type CategoryType = "collection" | "sale";

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  image: string;
  description: string;
  parent_id: number | null;
  show_in_menu: 0 | 1;
  saleQuantity?: string;
  salePrice?: string;
}

type UpdateCategoryPayload = {
  name: string;
  type: CategoryType;
  image: string;
  description: string;
  parent_id: number | null;
  show_in_menu: 0 | 1;
  saleQuantity?: number;
  salePrice?: number;
};

type ProductImage = {
  key?: string;
  url: string;
  size?: number;
  updated_at?: string | null;
  name?: string;
};

type Props = { id: string };

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

export default function EditCategory({ id }: Props) {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [parentCategories, setParentCategories] = useState<
    Array<Pick<Category, "id" | "name">>
  >([]);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  // ---- camera / device upload
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);

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

      setCategory((prev) =>
        prev
          ? { ...prev, image: url, name: prev.name || baseName(file.name) }
          : prev
      );
      showToast("התמונה הועלתה בהצלחה", "success");
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

  // ---- app gallery modal
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

  const pickFromAppGallery = (it: ProductImage) => {
    setCategory((prev) =>
      prev
        ? {
            ...prev,
            image: it.url,
            name: prev.name || it.name || baseName(it.url),
          }
        : prev
    );
    setAppGalleryOpen(false);
  };

  // ---- load category + parents
  useEffect(() => {
    (async () => {
      try {
        const [res, listRes] = await Promise.all([
          fetch(`/api/categories/${id}`),
          fetch(`/api/categories?full=true`),
        ]);
        if (!res.ok || !listRes.ok) throw new Error();

        const data: {
          category: Category & { saleQuantity?: number; salePrice?: number };
        } = await res.json();
        const all: { categories: Category[] } = await listRes.json();

        const parsed: Category = {
          ...data.category,
          description: data.category.description || "",
          saleQuantity:
            (data.category as any).saleQuantity != null
              ? String((data.category as any).saleQuantity)
              : "",
          salePrice:
            (data.category as any).salePrice != null
              ? String((data.category as any).salePrice)
              : "",
        };

        setCategory(parsed);
        setSelectedParentId(parsed.parent_id ?? null);
        setParentCategories(
          all.categories
            .filter((c) => c.id !== Number(id))
            .map((c) => ({ id: c.id, name: c.name }))
        );
      } catch {
        showToast("שגיאה בטעינת הקטגוריה", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ---- form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target as any;
    setCategory((prev) =>
      prev
        ? { ...prev, [name]: type === "checkbox" ? (checked ? 1 : 0) : value }
        : prev
    );
  };

  const handleTypeChange = (value: CategoryType) => {
    setCategory((prev) =>
      prev ? { ...prev, type: value, saleQuantity: "", salePrice: "" } : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    if (!category.name.trim()) {
      showToast("יש להזין שם קטגוריה", "error");
      return;
    }

    if (category.type === "sale") {
      if (!category.saleQuantity || !category.salePrice) {
        showToast("יש להזין פרטי מבצע תקינים", "error");
        return;
      }
      if (
        Number(category.saleQuantity) <= 0 ||
        Number(category.salePrice) < 0
      ) {
        showToast("ערכי מבצע לא חוקיים", "error");
        return;
      }
    }

    const sanitizedName = category.name.trim().replace(/\s+/g, "-");

    const payload: UpdateCategoryPayload = {
      name: sanitizedName,
      type: category.type,
      image: category.image,
      description: category.description,
      parent_id: selectedParentId ?? null,
      show_in_menu: category.show_in_menu,
    };

    if (category.type === "sale") {
      payload.saleQuantity = Number(category.saleQuantity);
      payload.salePrice = Number(category.salePrice);
    }

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "שגיאה בעדכון הקטגוריה");
      }
      showToast("עודכן בהצלחה", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "שגיאה בעדכון", "error");
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק את הקטגוריה?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("הקטגוריה נמחקה בהצלחה", "success");
      window.location.href = "/categories";
    } catch {
      showToast("שגיאה בעת מחיקת הקטגוריה", "error");
    }
  };

  if (loading) return <div className="p-4">טוען...</div>;
  if (!category)
    return <div className="p-4 text-red-600">לא נמצאה קטגוריה</div>;

  const previewSrc = category.image || "";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        עריכת קטגוריה
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        {/* LEFT */}
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <Label>שם הקטגוריה:</Label>
            <div className="flex gap-2">
              <Input
                name="name"
                value={category.name || ""}
                onChange={handleChange}
              />
              {!!category.name && (
                <Button
                  type="button"
                  variant="outline"
                  className="px-2"
                  onClick={() =>
                    setCategory((p) => (p ? { ...p, name: "" } : p))
                  }
                >
                  נקה
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>תיאור:</Label>
            <Input
              name="description"
              value={category.description || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>סוג הקטגוריה:</Label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={category.type}
              onChange={(e) => handleTypeChange(e.target.value as CategoryType)}
            >
              <option value="collection">אוסף</option>
              <option value="sale">מבצע</option>
            </select>
          </div>

          {category.type === "sale" && (
            <div>
              <Label>פרטי מבצע:</Label>
              <div className="flex gap-2 items-center">
                <Input
                  name="saleQuantity"
                  type="number"
                  value={category.saleQuantity ?? ""}
                  onChange={handleChange}
                  placeholder="כמות"
                  className="w-1/2"
                  min="1"
                />
                <span className="text-sm">ב־</span>
                <Input
                  name="salePrice"
                  type="number"
                  value={category.salePrice ?? ""}
                  onChange={handleChange}
                  placeholder="מחיר"
                  className="w-1/2"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <div>
            <Label>קטגוריית אב:</Label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedParentId ?? ""}
              onChange={(e) =>
                setSelectedParentId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">— ללא —</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full mt-4">
            שמור שינויים
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            className="w-full mt-2 bg-red-600 text-white hover:bg-red-700"
          >
            מחק קטגוריה
          </Button>
        </div>

        {/* RIGHT: preview + FOUR BUTTONS */}
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
                    category.name || "ice cream"
                  )}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
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
              className="w-full"
              title="פתח ספריית תמונות מהאפליקציה"
            >
              📁 ספריית אפליקציה
            </Button>
          </div>
        </aside>
      </form>

      {/* -------- APP GALLERY MODAL -------- */}
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
                  const isActive = category.image === it.url;
                  return (
                    <button
                      key={it.url}
                      type="button"
                      onClick={() => pickFromAppGallery(it)}
                      className={`relative w-full h-28 border rounded overflow-hidden ${
                        isActive
                          ? "ring-2 ring-emerald-500"
                          : "hover:ring-2 hover:ring-blue-400"
                      }`}
                      title={name}
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
    </div>
  );
}
