"use client";

import { useEffect, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { showToast } from "../../ui/toast";
import { useSearchParams, useRouter } from "next/navigation";
import ImageSelector from "../../ui/image-selector";
import Image from "next/image";
import ProductStorageSelector from "@/components/cms/entities/product/ui/product-storage-selector";
import CategorySelector from "@/components/cms/entities/product/ui/category";

type ProductForm = {
  name: string;
  price: string;
  image: string;
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

export default function NewProduct() {
  const searchParams = useSearchParams();
  const prefillImage = searchParams.get("image");
  const router = useRouter();

  const [product, setProduct] = useState<ProductForm>({
    name: "",
    price: "",
    image: "", // store the S3 URL here
    saleQuantity: "",
    salePrice: "",
    storageAreaId: null,
    categories: [],
  });

  // the text shown/typed in the selector input (basename without extension)
  const [imageDraft, setImageDraft] = useState("");

  // S3 images for the selector
  const [imageItems, setImageItems] = useState<
    { id: number; name: string; image: string }[]
  >([]);

  // URLs of images already used by other products (to disable them)
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set());

  const [isSubmitting, setIsSubmitting] = useState(false);

  // helper to derive display name from URL
  const fileBase = (url: string) => {
    const file = url.split("/").pop() || "";
    return file.split(".")[0];
  };

  // Prefill from query param (URL)
  useEffect(() => {
    if (prefillImage) {
      const displayName = fileBase(prefillImage);
      setProduct((prev) => ({
        ...prev,
        image: prefillImage, // commit URL
        name: prev.name || displayName,
      }));
      setImageDraft(displayName); // show human-readable
    }
  }, [prefillImage]);

  // Load already-used image URLs (to disable them)
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const paths = new Set<string>();
        (data.products || []).forEach((p: { image?: string }) => {
          if (p.image) paths.add(p.image);
        });
        setUsedImages(paths);
      })
      .catch((err) => console.error("Failed to fetch products", err));
  }, []);

  // Load S3 images
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/images", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load images");
        const data: unknown = await res.json();

        type ApiItem = string | { url: string; key?: string; name?: string };

        const stripExt = (s: string) => s.replace(/\.[^/.]+$/, "");
        const filename = (p: string) => {
          const last = p.split("/").pop() || p;
          return decodeURIComponent(last);
        };

        const items =
          (Array.isArray(data) ? (data as ApiItem[]) : []).map((it, idx) => {
            if (typeof it === "string") {
              const display = stripExt(filename(it));
              return { id: idx, name: display, image: it };
            } else {
              const url = it.url;
              // Prefer index name; else fall back to key/url filename
              const display = stripExt(it.name ?? filename(it.key ?? it.url));
              return { id: idx, name: display, image: url };
            }
          }) ?? [];

        // ensure prefilled image (if any) is part of the list so selector can resolve its name
        if (product.image && !items.find((i) => i.image === product.image)) {
          items.push({
            id: -1,
            name: stripExt(filename(product.image)),
            image: product.image,
          });
        }

        setImageItems(items);
      } catch (e) {
        console.error(e);
        setImageItems([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      showToast("נא לבחור תמונה (מספרייה)", "error");
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
      image: product.image, // already a full S3 URL
    };

    const quantity = Number(product.saleQuantity);
    const sale = Number(product.salePrice);
    if (!isNaN(quantity) && product.saleQuantity !== "")
      payload.saleQuantity = quantity;
    if (!isNaN(sale) && product.salePrice !== "") payload.salePrice = sale;

    try {
      // 1) Create
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

      // 2) Assign storage area
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

      // 3) Assign categories
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

      // Reset
      setProduct({
        name: "",
        price: "",
        image: "",
        saleQuantity: "",
        salePrice: "",
        storageAreaId: null,
        categories: [],
      });
      setImageDraft("");
    } catch (err: any) {
      console.error(err);
      showToast(`❌ שגיאה: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewSrc = product.image || "";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
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
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            // Disable images that are already used (by URL)
            items={imageItems
              .map((i) => ({ ...i, disabled: usedImages.has(i.image) }))
              .sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled))}
            // Use the DRAFT as the controlled text so you can type freely
            value={imageDraft}
            onChange={(item) => {
              if (!item) {
                setImageDraft("");
                setProduct((prev) => ({ ...prev, image: "" }));
                return;
              }
              // Free typing path: ImageSelector sends { id:"", name:"typed" } with no image
              if (!("image" in item) || !item.image) {
                setImageDraft(item.name);
                // do NOT change product.image until user selects a real item
                return;
              }
              // Item selected from list → commit URL and show its basename
              if (item.disabled) return; // respect disabled
              setProduct((prev) => ({
                ...prev,
                image: item.image, // full S3 URL
                name: prev.name || item.name, // optional UX: default name from image
              }));
              setImageDraft(item.name);
            }}
            // we already control the text via imageDraft, so just return it
            getDisplayValue={(val) => val}
            placeholder="שם תמונה (ניתן להקליד או לבחור מהרשימה)"
            label="תמונה"
            disabled={isSubmitting}
          />

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
                  className="px-2 cursor-pointer"
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
            {isSubmitting && (
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
            )}
            {isSubmitting ? "שומר..." : "צור מוצר"}
          </Button>
        </div>

        <div className="w-full md:w-1/2">
          {previewSrc && (
            <Image
              src={previewSrc}
              alt="תצוגה מקדימה"
              width={500}
              height={300}
              className="w-full max-h-96 object-contain border rounded-md"
            />
          )}
        </div>
      </form>
    </div>
  );
}
