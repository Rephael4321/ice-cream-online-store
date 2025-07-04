"use client";

import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import ImageSelector from "./ui/image-selector";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { images } from "@/data/images";
import Image from "next/image";

type CategoryType = "collection" | "sale";

interface Category {
  id: number;
  name: string;
  type: CategoryType;
  image: string;
  description: string;
  parent_id: number | null;
  show_in_menu: 0 | 1;
  saleQuantity?: string;
  salePrice?: string;
}

type UpdateCategoryPayload = {
  name: string;
  type: CategoryType;
  image: string;
  description: string;
  parent_id: number | null;
  show_in_menu: 0 | 1;
  saleQuantity?: number;
  salePrice?: number;
};

type Props = { id: string };

export default function EditCategory({ id }: Props) {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/categories/${id}`);
        if (!res.ok) throw new Error("שגיאה בטעינת קטגוריה");
        const data: { category: Category } = await res.json();
        setCategory(data.category);
      } catch {
        alert("שגיאה בטעינת הקטגוריה");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategory((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleTypeChange = (value: CategoryType) => {
    setCategory((prev) =>
      prev
        ? {
            ...prev,
            type: value,
            saleQuantity: "",
            salePrice: "",
          }
        : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    const payload: UpdateCategoryPayload = {
      name: category.name,
      type: category.type,
      image: imagePathMap[category.image] || category.image,
      description: category.description,
      parent_id: category.parent_id,
      show_in_menu: category.show_in_menu,
    };

    if (category.type === "sale") {
      if (!category.saleQuantity || !category.salePrice) {
        alert("יש להזין פרטי מבצע תקינים");
        return;
      }
      payload.saleQuantity = Number(category.saleQuantity);
      payload.salePrice = Number(category.salePrice);
    }

    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("שגיאה: " + err.error);
      return;
    }

    alert("עודכן בהצלחה");
  };

  if (loading) return <div className="p-4">טוען...</div>;
  if (!category)
    return <div className="p-4 text-red-600">לא נמצאה קטגוריה</div>;

  const previewSrc =
    imagePathMap[category.image] ||
    images.find((img) => img.includes(category.image)) ||
    "";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
        עריכת קטגוריה
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        {/* טופס */}
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            value={category.image}
            onChange={(imageName, fullPath) => {
              setCategory((prev) =>
                prev ? { ...prev, image: imageName } : prev
              );
              setImagePathMap((prev) => ({ ...prev, [imageName]: fullPath }));
            }}
            placeholder="בחר תמונה"
            label="תמונה"
          />

          <div>
            <Label>שם הקטגוריה:</Label>
            <Input name="name" value={category.name} onChange={handleChange} />
          </div>

          <div>
            <Label>תיאור:</Label>
            <Input
              name="description"
              value={category.description}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>סוג הקטגוריה:</Label>
            <Select value={category.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue placeholder="בחר סוג" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collection">אוסף</SelectItem>
                <SelectItem value="sale">מבצע</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {category.type === "sale" && (
            <div>
              <Label>פרטי מבצע:</Label>
              <div className="flex gap-2 items-center">
                <Input
                  name="saleQuantity"
                  type="number"
                  value={category.saleQuantity}
                  onChange={handleChange}
                  placeholder="כמות"
                  className="w-1/2"
                />
                <span className="text-sm">ב־</span>
                <Input
                  name="salePrice"
                  type="number"
                  value={category.salePrice}
                  onChange={handleChange}
                  placeholder="מחיר"
                  className="w-1/2"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full mt-4 cursor-pointer">
            שמור שינויים
          </Button>
        </div>

        {/* תצוגה מקדימה */}
        <div className="w-full md:w-1/2">
          {previewSrc && (
            <Image
              src={previewSrc}
              alt="תצוגה מקדימה"
              width={500}
              height={500}
              className="w-full h-auto max-h-96 object-contain border rounded-md"
            />
          )}
        </div>
      </form>
    </div>
  );
}
