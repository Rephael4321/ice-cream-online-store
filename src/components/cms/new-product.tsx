"use client";

import { useState, useMemo } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import ImageSelector from "./ui/image-selector";
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

export default function NewProduct() {
  const [product, setProduct] = useState<ProductForm>({
    name: "",
    price: "",
    image: "",
    saleQuantity: "",
    salePrice: "",
  });

  const [focused, setFocused] = useState(false);
  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});
  const [showGallery, setShowGallery] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  const clearName = () => {
    setProduct((prev) => ({ ...prev, name: "" }));
  };

  const getDisplayName = (path: string): string => {
    const parts = path.split("/");
    const file = parts[parts.length - 1];
    return file.split(".")[0];
  };

  const handleSuggestionClick = (fullPath: string) => {
    const nameOnly = getDisplayName(fullPath);
    setProduct({
      ...product,
      image: nameOnly,
      name: nameOnly,
    });
    setImagePathMap((prev) => ({ ...prev, [nameOnly]: fullPath }));
  };

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
      alert("Saved with ID: " + result.productId);

      setProduct({
        name: "",
        price: "",
        image: "",
        saleQuantity: "",
        salePrice: "",
      });
    } catch (err) {
      console.error(err);
      alert("Error saving product");
    }
  };

  const filteredImages = useMemo(() => {
    if (!product.image) return images.slice(0, 10);
    return images
      .filter((img) =>
        getDisplayName(img).toLowerCase().includes(product.image.toLowerCase())
      )
      .slice(0, 10);
  }, [product.image]);

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
        {/* Left Column: Form */}
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            value={product.image}
            onChange={(imageName, fullPath) => {
              setProduct((prev) => ({
                ...prev,
                image: imageName,
                name: imageName,
              }));
              setImagePathMap((prev) => ({ ...prev, [imageName]: fullPath }));
            }}
          />

          {/* Product Name */}
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
                  className="whitespace-nowrap px-2"
                  onClick={clearName}
                >
                  נקה
                </Button>
              )}
            </div>
          </div>

          {/* Price */}
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

          {/* Sale */}
          <div>
            <Label>מבצע (למשל 3 ב- 30)</Label>
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
              <span className="text-sm">ב&nbsp;-</span>
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

          <Button type="submit" className="w-full mt-4 md:mt-6">
            צור מוצר
          </Button>
        </div>

        {/* Right Column: Image Preview */}
        <div className="w-full md:w-1/2">
          {previewSrc && (
            <img
              src={previewSrc}
              alt="Preview"
              className="w-full max-h-96 object-contain border rounded-md"
            />
          )}
        </div>
      </form>

      {showGallery && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center"
          onClick={() => setShowGallery(false)}
        >
          <div
            className="bg-white max-w-4xl w-full max-h-[80vh] overflow-y-auto p-4 rounded shadow-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">גלריית תמונות</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => {
                    handleSuggestionClick(img);
                    setShowGallery(false);
                  }}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-32 object-contain rounded border bg-white"
                  />
                  <p className="text-center text-xs mt-1">
                    {getDisplayName(img)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
