"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import ImageSelector from "../../ui/image-selector";
import { images } from "@/data/images";

type ProductForm = {
  name: string;
  price: string;
  image: string;
  saleQuantity: string;
  salePrice: string;
};

type ProductPayload = {
  name: string;
  price: string;
  image: string;
  saleQuantity?: string;
  salePrice?: string;
};

export default function ProductForm() {
  const [product, setProduct] = useState<ProductForm>({
    name: "",
    price: "",
    image: "",
    saleQuantity: "",
    salePrice: "",
  });

  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  const clearName = () => {
    setProduct((prev) => ({ ...prev, name: "" }));
  };

  const getDisplayName = (path: string): string => {
    const file = path.split("/").pop() || "";
    return file.split(".")[0];
  };

  const imageItems = images.map((path, index) => ({
    id: index,
    name: getDisplayName(path),
    image: path,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullImagePath =
      imagePathMap[product.image] ||
      images.find((img) => getDisplayName(img) === product.image) ||
      "";

    const payload: ProductPayload = {
      name: product.name,
      price: product.price,
      image: fullImagePath,
    };

    if (product.saleQuantity) payload.saleQuantity = product.saleQuantity;
    if (product.salePrice) payload.salePrice = product.salePrice;

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save product");
      const result = await response.json();
      alert("נשמר בהצלחה עם מזהה: " + result.productId);

      setProduct({
        name: "",
        price: "",
        image: "",
        saleQuantity: "",
        salePrice: "",
      });
    } catch (err) {
      console.error(err);
      alert("שגיאה בשמירת המוצר");
    }
  };

  const previewSrc =
    imagePathMap[product.image] ||
    images.find((img) => getDisplayName(img) === product.image) ||
    "";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        מוצר חדש
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        {/* Left Column */}
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            items={imageItems}
            value={product.image}
            onChange={(item) => {
              if (!item) {
                setProduct((prev) => ({ ...prev, image: "" }));
                return;
              }

              setProduct((prev) => ({
                ...prev,
                image: item.name,
                name: item.name,
              }));

              setImagePathMap((prev) => ({
                ...prev,
                [item.name]: item.image || "",
              }));
            }}
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
              />
              {product.name && (
                <Button
                  type="button"
                  variant="outline"
                  className="px-2 cursor-pointer"
                  onClick={clearName}
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
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-4 md:mt-6 cursor-pointer">
            צור מוצר
          </Button>
        </div>

        {/* Right Column: Preview */}
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
