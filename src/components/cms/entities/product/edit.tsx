"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { Label } from "@/components/cms/ui/label";
import { showToast } from "@/components/cms/ui/toast";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import Category from "@/components/cms/entities/product/ui/category";
import ProductStorageSelector from "@/components/cms/entities/product/ui/product-storage-selector";
import SaleGroupPriceConflictModal from "@/components/cms/entities/sale-group/ui/sale-group-price-conflict-modal";
import ImagePickerPanel from "@/components/cms/shared/image-picker-panel";

interface ProductDetail {
  id: string;
  name: string;
  price: string | number;
  image?: string;
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

  // ---------- modal actions ----------
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

  if (loading) return <p>טוען מוצר...</p>;
  if (error) return <p>שגיאה: {error}</p>;
  if (!product) return <p>מוצר לא נמצא.</p>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      {/* Shared header title (rendered by the section layout) */}
      <HeaderHydrator title={`עריכת מוצר — ${product?.name ?? ""}`} />

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

        {/* RIGHT = shared image picker */}
        <aside className="w-full md:w-1/2 space-y-4">
          <ImagePickerPanel
            value={product.image || ""}
            disabled={saving}
            googleQuery={product.name || "ice cream"}
            previewClassName="relative w-full h-96 border rounded-md bg-white"
            onChange={(url) =>
              setProduct((prev) => (prev ? { ...prev, image: url } : prev))
            }
          />
        </aside>
      </form>

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
