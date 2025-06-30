"use client";

import { useEffect, useState, useMemo } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { images } from "@/data/images";

interface ProductDetail {
  id: string;
  name: string;
  price: string | number;
  image?: string;
  saleQuantity?: number | string;
  salePrice?: number | string;
}

export default function Product({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focused, setFocused] = useState(false);
  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProduct() {
      try {
        const { id } = await params;
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("ארעה תקלה בטעינת מוצר");
        const data = await res.json();
        const loaded = data.product ?? data;

        const displayName = getDisplayName(loaded.image || "");
        setProduct({ ...loaded, image: displayName });
        setImagePathMap({ [displayName]: loaded.image });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [params]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product) return;
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  const getDisplayName = (path: string) => {
    const parts = path.split("/");
    const file = parts[parts.length - 1];
    return file.split(".")[0];
  };

  const handleSuggestionClick = (fullPath: string) => {
    const nameOnly = getDisplayName(fullPath);
    setProduct((prev) =>
      prev ? { ...prev, image: nameOnly, name: prev.name || nameOnly } : null
    );
    setImagePathMap((prev) => ({ ...prev, [nameOnly]: fullPath }));
    setFocused(false);
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

    const isValidSalePrice =
      !isSalePriceEmpty && !isNaN(sale) && Number(sale) >= 0;

    const fullImagePath =
      imagePathMap[displayImage || ""] ||
      images.find((img) => getDisplayName(img) === (displayImage || "")) ||
      "";

    const updatedProduct: any = {
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
      // ignore
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
    }
  };

  const filteredImages = useMemo(() => {
    if (!product?.image) return images.slice(0, 10);
    return images
      .filter((img) =>
        getDisplayName(img)
          .toLowerCase()
          .includes((product.image || "").toLowerCase())
      )
      .slice(0, 10);
  }, [product?.image]);

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
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        <div className="w-full md:w-1/2 space-y-4">
          {/* Image Input with Suggestions */}
          <div className="relative">
            <Label htmlFor="image">תמונה:</Label>
            <Input
              id="image"
              name="image"
              value={product.image || ""}
              onChange={handleChange}
              placeholder="גלידה"
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 100)}
            />
            {focused && filteredImages.length > 0 && (
              <ul className="absolute z-10 w-full max-h-60 overflow-y-auto bg-white border rounded-md shadow top-full mt-1">
                {filteredImages.map((img, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onMouseDown={() => handleSuggestionClick(img)}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-8 h-8 object-cover rounded border"
                    />
                    <span>{getDisplayName(img)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name">שם:</Label>
            <Input
              id="name"
              name="name"
              value={product.name}
              onChange={handleChange}
              placeholder="שם מוצר"
              required
            />
          </div>

          {/* Price */}
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
            />
          </div>

          {/* Sale */}
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
              />
              <span className="text-sm">ב-</span>
              <Input
                name="salePrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="מחיר"
                value={product.salePrice || ""}
                onChange={handleChange}
                className="w-1/2"
              />
            </div>
          </div>

          {/* Save */}
          <Button type="submit" className="w-full mt-4">
            {saving ? "שומר..." : "שמור"}
          </Button>

          {/* Delete */}
          <Button
            type="button"
            className="w-full mt-2 bg-red-600 text-white hover:bg-red-700"
            onClick={handleDelete}
          >
            מחק מוצר
          </Button>
        </div>

        {/* Preview */}
        <div className="w-full md:w-1/2">
          {previewSrc && (
            <img
              src={previewSrc}
              alt={product.name}
              className="w-full max-h-96 object-contain border rounded-md"
            />
          )}
        </div>
      </form>
    </div>
  );
}
