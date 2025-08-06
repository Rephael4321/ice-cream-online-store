"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { Label } from "@/components/cms/ui/label";
import { images } from "@/data/images";
import Image from "next/image";
import ImageSelector from "@/components/cms/ui/image-selector";
import Category from "@/components/cms/entities/product/ui/category";

interface ProductDetail {
  id: string;
  name: string;
  price: string | number;
  image?: string;
  saleQuantity?: string | number;
  salePrice?: string | number;
  inStock: boolean;
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

export default function EditProduct({ params }: ParamsProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("ארעה תקלה בטעינת מוצר");
        const data = await res.json();
        const loaded = data.product ?? data;

        const displayName = getDisplayName(loaded.image || "");

        setProduct({
          id: loaded.id,
          name: loaded.name,
          price: loaded.price,
          image: displayName,
          saleQuantity: loaded.sale?.quantity ?? "",
          salePrice: loaded.sale?.price ?? "",
          inStock: loaded.in_stock,
        });

        setImagePathMap({ [displayName]: loaded.image });

        const catRes = await fetch(`/api/products/${loaded.id}/categories`);
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [params]);

  const getDisplayName = (path: string) => {
    const file = path.split("/").pop() || "";
    return file.split(".")[0];
  };

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
    } catch (err) {
      console.error(err);
      alert("שגיאה בעדכון המלאי");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product) return;
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  const handleSave = async () => {
    if (!product) return;

    const {
      name,
      price,
      saleQuantity,
      salePrice,
      id,
      image: displayImage,
    } = product;

    if (!name.trim() || isNaN(Number(price))) {
      alert("חובה למלא שם ומחיר");
      return;
    }

    const quantity = Number(saleQuantity);
    const sale = Number(salePrice);
    const isQuantityEmpty = saleQuantity === "";
    const isSalePriceEmpty = salePrice === "";

    const isValidQuantity =
      !isQuantityEmpty &&
      !isNaN(quantity) &&
      Number.isInteger(quantity) &&
      quantity > 0;

    const isValidSalePrice = !isSalePriceEmpty && !isNaN(sale) && sale >= 0;

    const fullImagePath =
      imagePathMap[displayImage || ""] ||
      images.find((img) => getDisplayName(img) === (displayImage || "")) ||
      "";

    const updatedProduct: ProductUpdatePayload = {
      name,
      price: Number(price),
      image: fullImagePath || null,
    };

    if (isQuantityEmpty && isSalePriceEmpty) {
      updatedProduct.saleQuantity = null;
      updatedProduct.salePrice = null;
    } else if (isValidQuantity && isValidSalePrice) {
      updatedProduct.saleQuantity = quantity;
      updatedProduct.salePrice = sale;
    } else if (
      (isValidQuantity && isSalePriceEmpty) ||
      (isValidSalePrice && isQuantityEmpty)
    ) {
    } else {
      setProduct((prev) =>
        prev ? { ...prev, saleQuantity: "", salePrice: "" } : prev
      );
      updatedProduct.saleQuantity = null;
      updatedProduct.salePrice = null;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProduct),
      });
      if (!res.ok) throw new Error("ארעה תקלה בשמירת מוצר");
      alert("מוצר נשמר!");
    } catch (err) {
      console.error(err);
      alert("תקלה בשמירת מוצר!");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק את המוצר?")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ארעה תקלה במחיקת המוצר");

      alert("מוצר נמחק!");
      window.location.href = "/products";
    } catch (err) {
      console.error(err);
      alert("תקלה במחיקת מוצר");
    } finally {
      setSaving(false);
    }
  };

  const previewSrc =
    imagePathMap[product?.image || ""] ||
    images.find((img) => getDisplayName(img) === (product?.image || "")) ||
    "";

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
          <ImageSelector
            items={images.map((path, index) => ({
              id: index,
              name: getDisplayName(path),
              image: path,
            }))}
            value={product.image || ""}
            onChange={(item) => {
              setProduct((prev) =>
                prev ? { ...prev, image: item?.name || "" } : prev
              );
              if (item?.name && item.image) {
                setImagePathMap((prev) => ({
                  ...prev,
                  [item.name]: item.image,
                }));
              }
            }}
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
              onChange={handleChange}
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
              onChange={handleChange}
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
                onChange={handleChange}
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
                onChange={handleChange}
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
            {product.inStock ? "❌ סמן כחסר במלאי" : "✔️ החזר למלאי"}
          </Button>

          <Button type="submit" className="w-full mt-4" disabled={saving}>
            {saving ? "שומר..." : "שמור"}
          </Button>

          <Button
            type="button"
            className="w-full mt-2 bg-red-600 text-white hover:bg-red-700"
            onClick={handleDelete}
            disabled={saving}
          >
            מחק מוצר
          </Button>
        </div>

        <div className="w-full md:w-1/2">
          {previewSrc && (
            <div className="relative w-full h-96 border rounded-md">
              <Image
                src={previewSrc}
                alt={product.name}
                fill
                className="object-contain rounded-md"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
