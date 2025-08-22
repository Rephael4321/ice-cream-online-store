"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { Label } from "@/components/cms/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/cms/ui/select";
import Image from "next/image";
import { showToast } from "@/components/cms/ui/toast";

type CategoryForm = {
  name: string;
  type: "collection" | "sale";
  image: string; // full S3 URL (or "")
  saleQuantity: string;
  salePrice: string;
  showInMenu: boolean;
};

type CategoryPayload = {
  name: string;
  type: "collection" | "sale";
  image: string; // send full URL to backend
  saleQuantity?: number;
  salePrice?: number;
  show_in_menu?: boolean;
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

export default function NewCategory() {
  const [category, setCategory] = useState<CategoryForm>({
    name: "",
    type: "collection",
    image: "",
    saleQuantity: "",
    salePrice: "",
    showInMenu: false,
  });

  // device/camera refs
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const deviceInputRef = useRef<HTMLInputElement | null>(null);

  // upload from camera/device
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

      setCategory((prev) => ({
        ...prev,
        image: url,
        name: prev.name || baseName(file.name),
      }));
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

  // app gallery modal state
  const [appGalleryOpen, setAppGalleryOpen] = useState(false);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
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
      // reuse the same endpoint as products page to surface unused S3 images
      const res = await fetch(`/api/products/unused-images?${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();

      const next = (data.images || []) as ProductImage[];

      if (opts.reset) {
        setImages(next);
      } else {
        setImages((prev) => [...prev, ...next]);
      }

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

  // lazy-load when opening modal
  useEffect(() => {
    if (appGalleryOpen && images.length === 0 && !loading) {
      setLoading(true);
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
    setCategory((prev) => ({
      ...prev,
      image: it.url,
      name: prev.name || it.name || baseName(it.url),
    }));
    setAppGalleryOpen(false);
  };

  // form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target as any;
    if (type === "checkbox") {
      setCategory((prev) => ({ ...prev, [name]: !!checked }));
    } else {
      setCategory((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (value: "collection" | "sale") => {
    setCategory((prev) => ({
      ...prev,
      type: value,
      saleQuantity: "",
      salePrice: "",
      showInMenu: false,
    }));
  };

  const previewSrc = category.image || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category.name.trim()) {
      showToast("נא להזין שם קטגוריה", "error");
      return;
    }

    if (category.type === "sale") {
      if (!category.saleQuantity || !category.salePrice) {
        showToast("נא למלא כמות ומחיר מבצע", "error");
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

    const payload: CategoryPayload = {
      name: category.name,
      type: category.type,
      image: category.image, // full S3 URL
    };

    if (category.type === "sale") {
      payload.saleQuantity = Number(category.saleQuantity);
      payload.salePrice = Number(category.salePrice);
      payload.show_in_menu = category.showInMenu;
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "שגיאה בשמירת הקטגוריה");
      }

      const data = await res.json();
      showToast(`✔ נשמר בהצלחה (מזהה: ${data.categoryId})`, "success");

      setCategory({
        name: "",
        type: "collection",
        image: "",
        saleQuantity: "",
        salePrice: "",
        showInMenu: false,
      });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "נכשלה שמירת הקטגוריה", "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        קטגוריה חדשה
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        {/* Left Column */}
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <Label htmlFor="name">שם:</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                name="name"
                value={category.name}
                onChange={handleChange}
                placeholder="שם קטגוריה"
                required
              />
              {category.name && (
                <Button
                  type="button"
                  variant="outline"
                  className="whitespace-nowrap px-2 cursor-pointer"
                  onClick={() => setCategory((prev) => ({ ...prev, name: "" }))}
                >
                  נקה
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>סוג קטגוריה:</Label>
            <Select value={category.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collection">אוסף</SelectItem>
                <SelectItem value="sale">מבצע</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {category.type === "sale" && (
            <div className="space-y-3">
              <div>
                <Label>מבצע (למשל 3 ב־30)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    name="saleQuantity"
                    type="number"
                    min="1"
                    value={category.saleQuantity}
                    onChange={handleChange}
                    placeholder="כמות"
                    className="w-1/2"
                  />
                  <span className="text-sm">ב־</span>
                  <Input
                    name="salePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={category.salePrice}
                    onChange={handleChange}
                    placeholder="מחיר"
                    className="w-1/2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="showInMenu"
                  name="showInMenu"
                  type="checkbox"
                  checked={category.showInMenu}
                  onChange={handleChange}
                  className="cursor-pointer"
                />
                <Label htmlFor="showInMenu">הצג בתפריט כמו אוסף</Label>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full mt-4 md:mt-6 cursor-pointer">
            צור קטגוריה
          </Button>
        </div>

        {/* Right Column: Preview + Image Actions */}
        <aside className="w-full md:w-1/2 space-y-4">
          <div className="relative w-full h-80 border rounded-md bg-white">
            {category.image ? (
              <Image
                src={category.image}
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

            {/* 2) Phone gallery (device) */}
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

            {/* 4) Open APP gallery (modal) */}
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
                    setLoading(true);
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
              {loading && images.length === 0 && (
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

              {!loading && images.length > 0 && filteredImages.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-8">
                  אין תוצאות תואמות
                </div>
              )}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-3">
                <Button onClick={() => fetchBatch()} disabled={loading}>
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
