"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { showToast } from "../../ui/toast";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import ProductStorageSelector from "@/components/cms/entities/product/ui/product-storage-selector";
import CategorySelector from "@/components/cms/entities/product/ui/category";

type ProductForm = {
  name: string;
  price: string;
  image: string; // full S3 URL
  saleQuantity: string;
  salePrice: string;
  storageAreaId?: number | null;
  categories: number[];
};

type ProductPayload = {
  name: string;
  price: number;
  image: string;
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

const PAGE_SIZE = 50;

export default function NewProduct() {
  const searchParams = useSearchParams();
  const prefillImage = searchParams.get("image");
  const router = useRouter();

  const [product, setProduct] = useState<ProductForm>({
    name: "",
    price: "",
    image: "",
    saleQuantity: "",
    salePrice: "",
    storageAreaId: null,
    categories: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // --------------- helpers
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

  // prefill from ?image=<url>
  useEffect(() => {
    if (prefillImage) {
      setProduct((prev) => ({
        ...prev,
        image: prefillImage,
        name: prev.name || baseName(prefillImage),
      }));
    }
  }, [prefillImage]);

  // --------------- device/camera pick
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

      setProduct((prev) => ({
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

  // --------------- APP GALLERY (hidden by default, opens via button)
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

  // open -> lazy load
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
    setProduct((prev) => ({
      ...prev,
      image: it.url,
      name: prev.name || it.name || baseName(it.url),
    }));
    setAppGalleryOpen(false);
  };

  // --------------- form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  const clearName = () => {
    setProduct((prev) => ({ ...prev, name: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!product.name.trim()) {
      showToast("נא להזין שם מוצר", "error");
      setIsSubmitting(false);
      return;
    }
    if (!product.image) {
      showToast("נא לבחור תמונה", "error");
      setIsSubmitting(false);
      return;
    }
    if (!product.price || isNaN(Number(product.price))) {
      showToast("נא להזין מחיר חוקי", "error");
      setIsSubmitting(false);
      return;
    }

    const payload: ProductPayload = {
      name: product.name,
      price: Number(product.price),
      image: product.image,
    };

    const quantity = Number(product.saleQuantity);
    const sale = Number(product.salePrice);
    if (!isNaN(quantity) && product.saleQuantity !== "")
      payload.saleQuantity = quantity;
    if (!isNaN(sale) && product.salePrice !== "") payload.salePrice = sale;

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorRes = await response.json().catch(() => ({}));
        throw new Error(errorRes.error || "Unknown error");
      }

      const result = await response.json();
      const productId = result.productId;
      showToast(`✔ נשמר בהצלחה (מזהה: ${productId})`);

      if (product.storageAreaId) {
        await fetch("/api/storage/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            storage_area_id: product.storageAreaId,
          }),
        });
      }

      if (product.categories.length > 0) {
        for (const categoryId of product.categories) {
          await fetch("/api/product-category", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetId: productId,
              categoryId,
              type: "product",
            }),
          });
        }
      }

      setProduct({
        name: "",
        price: "",
        image: "",
        saleQuantity: "",
        salePrice: "",
        storageAreaId: null,
        categories: [],
      });
    } catch (err: any) {
      console.error(err);
      showToast(`❌ שגיאה: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewSrc = product.image || "";
  const currentName = baseName(product.image);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      {/* Back */}
      <div className="mb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="cursor-pointer"
        >
          ← חזור
        </Button>
      </div>

      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        מוצר חדש
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        {/* LEFT = details */}
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <Label htmlFor="name">שם:</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                name="name"
                value={product.name}
                onChange={handleChange}
                placeholder="שם מוצר"
                required
                disabled={isSubmitting}
              />
              {product.name && (
                <Button
                  type="button"
                  variant="outline"
                  className="px-2"
                  onClick={clearName}
                  disabled={isSubmitting}
                >
                  נקה
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="price">מחיר:</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={product.price}
              onChange={handleChange}
              placeholder="מחיר רגיל"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label>מבצע (למשל 3 ב־30)</Label>
            <div className="flex items-center gap-2">
              <Input
                name="saleQuantity"
                type="number"
                min="1"
                value={product.saleQuantity}
                onChange={handleChange}
                placeholder="כמות"
                className="w-1/2"
                disabled={isSubmitting}
              />
              <span className="text-sm">ב־</span>
              <Input
                name="salePrice"
                type="number"
                min="0"
                step="0.01"
                value={product.salePrice}
                onChange={handleChange}
                placeholder="מחיר"
                className="w-1/2"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <ProductStorageSelector
            productId={0}
            initialStorageAreaId={product.storageAreaId}
            disabled={isSubmitting}
            mode="new"
            onChange={(id) =>
              setProduct((prev) => ({ ...prev, storageAreaId: id }))
            }
          />

          <CategorySelector
            productId="0"
            initialCategories={[]}
            disabled={isSubmitting}
            mode="new"
            onUpdate={(cats) =>
              setProduct((prev) => ({
                ...prev,
                categories: cats.map((c) => c.id),
              }))
            }
          />

          <Button
            type="submit"
            className="w-full mt-4 md:mt-6 flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                שומר...
              </>
            ) : (
              "צור מוצר"
            )}
          </Button>
        </div>

        {/* RIGHT = preview + FOUR BUTTONS */}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                    product.name || "ice cream"
                  )}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
                  const isActive = product.image === it.url;
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
