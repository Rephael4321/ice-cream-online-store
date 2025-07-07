"use client";

import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import ImageSelector from "./ui/image-selector";
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

type MinimalCategory = {
  id: number;
  name: string;
  image?: string;
};

type Props = { id: string };

export default function EditCategory({ id }: Props) {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [selectedParent, setSelectedParent] = useState<MinimalCategory | null>(
    null
  );
  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/categories/${id}`);
        const listRes = await fetch(`/api/categories?full=true`);
        if (!res.ok || !listRes.ok) throw new Error("שגיאה");

        const data: { category: Category } = await res.json();
        const all: { categories: Category[] } = await listRes.json();

        setCategory({
          ...data.category,
          description: data.category.description || "",
          saleQuantity: data.category.saleQuantity?.toString() ?? "",
          salePrice: data.category.salePrice?.toString() ?? "",
        });

        const filtered = all.categories.filter((c) => c.id !== Number(id));
        setParentCategories(filtered);
        const parent = filtered.find((c) => c.id === data.category.parent_id);
        if (parent) {
          setSelectedParent({
            id: parent.id,
            name: parent.name,
            image: parent.image,
          });
        }
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
      parent_id: selectedParent?.id || null,
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

  const handleDelete = async () => {
    if (!category) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק את הקטגוריה?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("שגיאה במחיקת קטגוריה");

      alert("הקטגוריה נמחקה בהצלחה");
      window.location.href = "/categories";
    } catch (err) {
      console.error(err);
      alert("שגיאה בעת מחיקת הקטגוריה");
    }
  };

  if (loading) return <div className="p-4">טוען...</div>;
  if (!category)
    return <div className="p-4 text-red-600">לא נמצאה קטגוריה</div>;

  const getDisplayName = (path: string): string => {
    const file = path.split("/").pop() || "";
    return file.split(".")[0];
  };

  const imageItems = images.map((path, index) => ({
    id: index,
    name: getDisplayName(path),
    image: path,
  }));

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
            items={imageItems}
            value={category.image}
            onChange={(item) => {
              if (!item) {
                setCategory((prev) => (prev ? { ...prev, image: "" } : prev));
                return;
              }
              setCategory((prev) =>
                prev ? { ...prev, image: item.name } : prev
              );
              setImagePathMap((prev) => ({
                ...prev,
                [item.name]: item.image || "",
              }));
            }}
            placeholder="בחר תמונה"
            label="תמונה"
          />

          <div>
            <Label>שם הקטגוריה:</Label>
            <Input
              name="name"
              value={category.name || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>תיאור:</Label>
            <Input
              name="description"
              value={category.description || ""}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>סוג הקטגוריה:</Label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={category.type}
              onChange={(e) => handleTypeChange(e.target.value as CategoryType)}
            >
              <option value="collection">אוסף</option>
              <option value="sale">מבצע</option>
            </select>
          </div>

          {category.type === "sale" && (
            <div>
              <Label>פרטי מבצע:</Label>
              <div className="flex gap-2 items-center">
                <Input
                  name="saleQuantity"
                  type="number"
                  value={category.saleQuantity ?? ""}
                  onChange={handleChange}
                  placeholder="כמות"
                  className="w-1/2"
                />
                <span className="text-sm">ב־</span>
                <Input
                  name="salePrice"
                  type="number"
                  value={category.salePrice ?? ""}
                  onChange={handleChange}
                  placeholder="מחיר"
                  className="w-1/2"
                />
              </div>
            </div>
          )}

          <ImageSelector
            items={parentCategories.map((cat) => ({
              id: cat.id,
              name: cat.name,
              image: cat.image,
            }))}
            value={selectedParent?.name || ""}
            onChange={(item) => {
              setSelectedParent(item);
              setCategory((prev) =>
                prev ? { ...prev, parent_id: item?.id || null } : prev
              );
            }}
            placeholder="בחר קטגוריה"
            label="קטגוריית אב"
          />

          <Button type="submit" className="w-full mt-4 cursor-pointer">
            שמור שינויים
          </Button>

          <Button
            type="button"
            onClick={handleDelete}
            className="w-full mt-2 bg-red-600 text-white hover:bg-red-700"
          >
            מחק קטגוריה
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
