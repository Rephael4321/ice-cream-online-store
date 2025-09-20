"use client";

import { useEffect, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { showToast } from "../../ui/toast";
import { useSearchParams } from "next/navigation";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import ImagePickerPanel, {
  baseName as baseNameFromPicker,
} from "@/components/cms/shared/image-picker-panel";
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

// local helper (kept for prefill)
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

export default function NewProduct() {
  const searchParams = useSearchParams();
  const prefillImage = searchParams.get("image");

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

      // Post-save linking in parallel
      const linking: Promise<any>[] = [];
      if (product.storageAreaId) {
        linking.push(
          fetch("/api/storage/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              product_id: productId,
              storage_area_id: product.storageAreaId,
            }),
          })
        );
      }
      if (product.categories.length > 0) {
        linking.push(
          Promise.all(
            product.categories.map((categoryId) =>
              fetch("/api/product-category", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  targetId: productId,
                  categoryId,
                  type: "product",
                }),
              })
            )
          )
        );
      }
      if (linking.length) await Promise.allSettled(linking);

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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      {/* Shared header title (rendered by the section layout) */}
      <HeaderHydrator title="מוצר חדש" />

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

        {/* RIGHT = shared image picker */}
        <aside className="w-full md:w-1/2 space-y-4">
          <ImagePickerPanel
            value={product.image}
            disabled={isSubmitting}
            googleQuery={product.name || "ice cream"}
            onChange={(url) =>
              setProduct((p) => ({
                ...p,
                image: url,
                name: p.name || baseNameFromPicker(url),
              }))
            }
          />
        </aside>
      </form>
    </div>
  );
}
