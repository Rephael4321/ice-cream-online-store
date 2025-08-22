"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { Label } from "@/components/cms/ui/label";
import { showToast } from "@/components/cms/ui/toast";
import Image from "next/image";
import Category from "@/components/cms/entities/product/ui/category";
import ProductStorageSelector from "@/components/cms/entities/product/ui/product-storage-selector";
import SaleGroupPriceConflictModal from "@/components/cms/entities/sale-group/ui/sale-group-price-conflict-modal";

interface ProductDetail {
  id: string;
  name: string;
  price: string | number;
  image?: string; // full S3 URL or ""
  saleQuantity?: string | number;
  salePrice?: string | number;
  inStock: boolean;
  storage_area_id?: number | null;
}

interface ParamsProps {
  params: Promise<{ id: string }>;
}

interface ProductUpdatePayload {
  name: string;
  price: number;
  image: string | null;
  saleQuantity?: number | null;
  salePrice?: number | null;
}

type ConflictState = null | {
  group: {
    id: number;
    name: string;
    price: number | null;
    quantity: number | null;
    sale_price: number | null;
  };
  items: {
    id: number;
    name: string;
    price: number | null;
    sale_quantity: number | null;
    sale_price: number | null;
  }[];
  nextPrice: number | null;
  nextSaleQty: number | null;
  nextSalePrice: number | null;
};

// ---------- helpers like in new-product ----------
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

type ProductImage = {
  key?: string;
  url: string;
  size?: number;
  updated_at?: string | null;
  name?: string;
};

const PAGE_SIZE = 50;

export default function EditProduct({ params }: ParamsProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  const [conflict, setConflict] = useState<ConflictState>(null);
  const [modalBusy, setModalBusy] = useState(false);

  // ---------- load product & categories ----------
  useEffect(() => {
    async function fetchAll() {
      try {
        const { id } = await params;

        // product
        const res = await fetch(`/api/products/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("ארעה תקלה בטעינת מוצר");
        const data = await res.json();
        const loaded = data.product ?? data;

        setProduct({
          id: loaded.id,
          name: loaded.name,
          price: loaded.price,
          image: loaded.image || "",
          saleQuantity: loaded.sale?.quantity ?? "",
          salePrice: loaded.sale?.price ?? "",
          inStock: loaded.in_stock,
          storage_area_id: loaded.storage_area_id ?? null,
        });

        // categories
        const catRes = await fetch(`/api/products/${loaded.id}/categories`, {
          cache: "no-store",
        });
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [params]);

  // ---------- stock toggle ----------
  const handleToggleStock = async () => {
    if (!product) return;

    const newStock = !product.inStock;
    setSaving(true);
    try {
      const res = await fetch("/api/products/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(product.id),
          inStock: newStock,
        }),
      });
      if (!res.ok) throw new Error("שגיאה בעדכון מלאי");
      setProduct({ ...product, inStock: newStock });
      showToast(newStock ? "הוחזר למלאי" : "סומן כחסר במלאי", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "שגיאה בעדכון המלאי", "error");
    } finally {
      setSaving(false);
    }
  };

  // ---------- payload compute (unchanged) ----------
  function computeUpdatePayload(p: ProductDetail): {
    payload: ProductUpdatePayload;
    nextPrice: number;
    nextSaleQty: number | null;
    nextSalePrice: number | null;
  } {
    const fullImagePath = p.image || "";
    const priceNum = Number(p.price);

    const quantity = Number(p.saleQuantity);
    const sale = Number(p.salePrice);
    const isQuantityEmpty =
      p.saleQuantity === "" || p.saleQuantity === undefined;
    const isSalePriceEmpty = p.salePrice === "" || p.salePrice === undefined;

    const isValidQuantity =
      !isQuantityEmpty &&
      !isNaN(quantity) &&
      Number.isInteger(quantity) &&
      quantity > 0;

    const isValidSalePrice = !isSalePriceEmpty && !isNaN(sale) && sale >= 0;

    const payload: ProductUpdatePayload = {
      name: p.name,
      price: priceNum,
      image: fullImagePath || null,
    };

    let nextSaleQty: number | null | undefined = undefined;
    let nextSalePrice: number | null | undefined = undefined;

    if (isQuantityEmpty && isSalePriceEmpty) {
      payload.saleQuantity = null;
      payload.salePrice = null;
      nextSaleQty = null;
      nextSalePrice = null;
    } else if (isValidQuantity && isValidSalePrice) {
      payload.saleQuantity = quantity;
      payload.salePrice = sale;
      nextSaleQty = quantity;
      nextSalePrice = sale;
    } else if (
      (isValidQuantity && isSalePriceEmpty) ||
      (isValidSalePrice && isQuantityEmpty)
    ) {
      nextSaleQty = undefined;
      nextSalePrice = undefined;
    } else {
      setProduct((prev) =>
        prev ? { ...prev, saleQuantity: "", salePrice: "" } : prev
      );
      payload.saleQuantity = null;
      payload.salePrice = null;
      nextSaleQty = null;
      nextSalePrice = null;
    }

    return {
      payload,
      nextPrice: priceNum,
      nextSaleQty: nextSaleQty ?? null,
      nextSalePrice: nextSalePrice ?? null,
    };
  }

  async function saveNormally(
    productId: string,
    payload: ProductUpdatePayload
  ) {
    const res = await fetch(`/api/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("ארעה תקלה בשמירת מוצר");
  }

  const handleSave = async () => {
    if (!product) return;

    const { name, id } = product;
    if (!name.trim() || isNaN(Number(product.price))) {
      showToast("חובה למלא שם ומחיר", "error");
      return;
    }

    const { payload, nextPrice, nextSaleQty, nextSalePrice } =
      computeUpdatePayload(product);

    setSaving(true);
    try {
      const vRes = await fetch(`/api/products/${id}/price-change/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: nextPrice,
          saleQuantity: nextSaleQty,
          salePrice: nextSalePrice,
        }),
      });

      if (!vRes.ok) throw new Error("תקלה בבדיקת קונפליקט קבוצה");
      const v = await vRes.json();

      if (!v.inGroup || !v.conflicts?.any) {
        await saveNormally(id, payload);
        showToast("מוצר נשמר!", "success");
        return;
      }

      setConflict({
        group: v.group,
        items: v.items,
        nextPrice,
        nextSaleQty,
        nextSalePrice,
      });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "תקלה בשמירת מוצר!", "error");
    } finally {
      setSaving(false);
    }
  };

  // ---------- IMAGE PICK UX (identical to new-product) ----------
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

      setProduct((prev) => (prev ? { ...prev, image: url } : prev));
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

  // ----- App gallery modal -----
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
    setProduct((prev) => (prev ? { ...prev, image: it.url } : prev));
    setAppGalleryOpen(false);
  };

  // ---------- modal actions (RESTORED, using toasts) ----------
  async function doDetach() {
    if (!product || !conflict) return;
    setModalBusy(true);
    try {
      await fetch(`/api/products/${product.id}/price-change`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "detach",
          price: conflict.nextPrice,
          saleQuantity: conflict.nextSaleQty,
          salePrice: conflict.nextSalePrice,
        }),
      });
      setConflict(null);
      showToast("הוסר מהקבוצה ועודכן בהצלחה", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "תקלה בעדכון", "error");
    } finally {
      setModalBusy(false);
    }
  }

  async function doPropagate() {
    if (!product || !conflict) return;
    setModalBusy(true);
    try {
      await fetch(`/api/products/${product.id}/price-change`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "propagate",
          price: conflict.nextPrice,
          saleQuantity: conflict.nextSaleQty,
          salePrice: conflict.nextSalePrice,
        }),
      });
      setConflict(null);
      showToast("עודכן לכלל מוצרי הקבוצה + נתוני הקבוצה", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "תקלה בעדכון", "error");
    } finally {
      setModalBusy(false);
    }
  }

  // ---------- render ----------
  const previewSrc = product?.image || "";

  if (loading) return <p>טוען מוצר...</p>;
  if (error) return <p>שגיאה: {error}</p>;
  if (!product) return <p>מוצר לא נמצא.</p>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        ערוך מוצר
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="relative flex flex-col md:flex-row gap-6 items-start"
      >
        {saving && (
          <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center rounded-md">
            <span className="text-xl font-semibold">שומר...</span>
          </div>
        )}

        <div className="w-full md:w-1/2 space-y-4">
          <ProductStorageSelector
            productId={Number(product.id)}
            initialStorageAreaId={product.storage_area_id}
            disabled={saving}
          />

          <Category
            productId={product.id}
            initialCategories={categories}
            onUpdate={setCategories}
            disabled={saving}
          />

          <div>
            <Label htmlFor="name">שם:</Label>
            <Input
              id="name"
              name="name"
              value={product.name}
              onChange={(e) =>
                setProduct((prev) =>
                  prev ? { ...prev, name: e.target.value } : prev
                )
              }
              placeholder="שם מוצר"
              required
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="price">מחיר: (₪)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={product.price}
              onChange={(e) =>
                setProduct((prev) =>
                  prev ? { ...prev, price: e.target.value } : prev
                )
              }
              placeholder="0.00"
              required
              disabled={saving}
            />
          </div>

          <div>
            <Label>מבצע: (רשות)</Label>
            <div className="flex items-center gap-2">
              <Input
                name="saleQuantity"
                type="number"
                min="1"
                step="1"
                placeholder="כמות"
                value={product.saleQuantity || ""}
                onChange={(e) =>
                  setProduct((prev) =>
                    prev ? { ...prev, saleQuantity: e.target.value } : prev
                  )
                }
                className="w-1/2"
                disabled={saving}
              />
              <span className="text-sm">ב־</span>
              <Input
                name="salePrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="מחיר"
                value={product.salePrice || ""}
                onChange={(e) =>
                  setProduct((prev) =>
                    prev ? { ...prev, salePrice: e.target.value } : prev
                  )
                }
                className="w-1/2"
                disabled={saving}
              />
            </div>
          </div>

          <Button
            type="button"
            className={`w-full mt-2 ${
              product.inStock ? "bg-yellow-500" : "bg-green-600 text-white"
            }`}
            onClick={handleToggleStock}
            disabled={saving}
          >
            {product.inStock ? "❌ סמן כחסר במלאי" : "✔️ החזר למלאי"}
          </Button>

          <Button type="submit" className="w-full mt-4" disabled={saving}>
            {saving ? "שומר..." : "שמור"}
          </Button>

          <Button
            type="button"
            className="w-full mt-2 bg-red-600 text-white hover:bg-red-700"
            onClick={async () => {
              if (!product) return;
              if (!confirm("האם אתה בטוח שברצונך למחוק את המוצר?")) return;
              setSaving(true);
              try {
                const res = await fetch(`/api/products/${product.id}`, {
                  method: "DELETE",
                });
                if (!res.ok) throw new Error("ארעה תקלה במחיקת המוצר");
                showToast("מוצר נמחק!", "success");
                window.location.href = "/products";
              } catch (err: any) {
                console.error(err);
                showToast(err.message || "תקלה במחיקת מוצר", "error");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            מחק מוצר
          </Button>
        </div>

        {/* RIGHT = preview + FOUR BUTTONS (same as new-product) */}
        <aside className="w-full md:w-1/2 space-y-4">
          <div className="relative w-full h-96 border rounded-md bg-white">
            {previewSrc ? (
              <Image
                src={previewSrc}
                alt={product.name}
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
              className="w-full"
              title="פתח ספריית תמונות מהאפליקציה"
            >
              📁 ספריית אפליקציה
            </Button>
          </div>
        </aside>
      </form>

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
                  const isActive = product?.image === it.url;
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

      {conflict && (
        <SaleGroupPriceConflictModal
          group={conflict.group}
          items={conflict.items}
          nextPrice={conflict.nextPrice}
          nextSaleQty={conflict.nextSaleQty}
          nextSalePrice={conflict.nextSalePrice}
          busy={modalBusy}
          onClose={() => setConflict(null)}
          onDetach={doDetach}
          onPropagate={doPropagate}
        />
      )}
    </div>
  );
}
