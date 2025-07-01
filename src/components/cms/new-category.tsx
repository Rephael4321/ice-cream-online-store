"use client";

import { useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import ImageSelector from "./ui/image-selector";
import { images } from "@/data/images";

export default function NewCategory() {
  const [category, setCategory] = useState({
    name: "",
    type: "brand",
    image: "",
    saleQuantity: "",
    salePrice: "",
  });

  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});

  const getDisplayName = (path: string) => {
    const file = path.split("/").pop() || "";
    return file.split(".")[0];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategory((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: string) => {
    setCategory((prev) => ({
      ...prev,
      type: value,
      saleQuantity: "",
      salePrice: "",
    }));
  };

  const clearName = () => {
    setCategory((prev) => ({ ...prev, name: "" }));
  };

  const previewSrc =
    imagePathMap[category.image] ||
    images.find((img) => getDisplayName(img) === category.image) ||
    "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category.name.trim()) {
      alert("נא להזין שם קטגוריה");
      return;
    }

    if (category.type === "sale") {
      if (!category.saleQuantity || !category.salePrice) {
        alert("נא למלא כמות ומחיר מבצע");
        return;
      }
    }

    const fullImagePath =
      imagePathMap[category.image] ||
      images.find((img) => getDisplayName(img) === category.image) ||
      "";

    const payload: any = {
      name: category.name,
      type: category.type,
      image: fullImagePath,
    };

    if (category.type === "sale") {
      payload.saleQuantity = Number(category.saleQuantity);
      payload.salePrice = Number(category.salePrice);
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        alert("שגיאה: " + error.error);
        return;
      }

      const data = await res.json();
      alert("נשמר בהצלחה עם מזהה: " + data.categoryId);

      setCategory({
        name: "",
        type: "brand",
        image: "",
        saleQuantity: "",
        salePrice: "",
      });
    } catch (err) {
      console.error(err);
      alert("נכשלה שמירת הקטגוריה");
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
        {/* Left Column: Form */}
        <div className="w-full md:w-1/2 space-y-4">
          {/* Image Input */}
          <ImageSelector
            value={category.image}
            onChange={(imageName, fullPath) => {
              setCategory((prev) => ({
                ...prev,
                image: imageName,
                name: prev.name ? prev.name : imageName,
              }));
              setImagePathMap((prev) => ({ ...prev, [imageName]: fullPath }));
            }}
            placeholder="גלידה וניל"
            label="שם תמונה"
          />

          {/* Category Name */}
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
                  className="whitespace-nowrap px-2"
                  onClick={clearName}
                >
                  נקה
                </Button>
              )}
            </div>
          </div>

          {/* Type */}
          <div>
            <Label>סוג קטגוריה:</Label>
            <Select value={category.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">מותג</SelectItem>
                <SelectItem value="collection">אוסף</SelectItem>
                <SelectItem value="sale">מבצע</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sale Fields */}
          {category.type === "sale" && (
            <div>
              <Label>מבצע (למשל 3 ב-30)</Label>
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
          )}

          <Button type="submit" className="w-full mt-4 md:mt-6">
            צור קטגוריה
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
    </div>
  );
}
