"use client";

import { useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { Label } from "@/components/cms/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/cms/ui/select";
import { showToast } from "@/components/cms/ui/toast";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import ImagePickerPanel, {
  baseName as baseNameFromPicker,
} from "@/components/cms/shared/image-picker-panel";
import { apiPost } from "@/lib/api/client";

type CategoryForm = {
  name: string;
  type: "collection" | "sale";
  image: string;
  saleQuantity: string;
  salePrice: string;
  showInMenu: boolean;
};

type CategoryPayload = {
  name: string;
  type: "collection" | "sale";
  image: string; // full URL
  saleQuantity?: number;
  salePrice?: number;
  show_in_menu?: boolean;
};

export default function NewCategory() {
  const [category, setCategory] = useState<CategoryForm>({
    name: "",
    type: "collection",
    image: "",
    saleQuantity: "",
    salePrice: "",
    showInMenu: false,
  });

  // form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target as any;
    if (type === "checkbox") {
      setCategory((prev) => ({ ...prev, [name]: !!checked }));
    } else {
      setCategory((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (value: "collection" | "sale") => {
    setCategory((prev) => ({
      ...prev,
      type: value,
      saleQuantity: "",
      salePrice: "",
      showInMenu: false,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category.name.trim()) {
      showToast("נא להזין שם קטגוריה", "error");
      return;
    }

    if (category.type === "sale") {
      if (!category.saleQuantity || !category.salePrice) {
        showToast("נא למלא כמות ומחיר מבצע", "error");
        return;
      }
      if (
        Number(category.saleQuantity) <= 0 ||
        Number(category.salePrice) < 0
      ) {
        showToast("ערכי מבצע לא חוקיים", "error");
        return;
      }
    }

    const payload: CategoryPayload = {
      name: category.name,
      type: category.type,
      image: category.image, // full S3 URL
    };

    if (category.type === "sale") {
      payload.saleQuantity = Number(category.saleQuantity);
      payload.salePrice = Number(category.salePrice);
      payload.show_in_menu = category.showInMenu;
    }

    try {
      const res = await apiPost("/api/categories", payload);

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "שגיאה בשמירת הקטגוריה");
      }

      const data = await res.json();
      showToast(`✔ נשמר בהצלחה (מזהה: ${data.categoryId})`, "success");

      setCategory({
        name: "",
        type: "collection",
        image: "",
        saleQuantity: "",
        salePrice: "",
        showInMenu: false,
      });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "נכשלה שמירת הקטגוריה", "error");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      {/* Shared header title (rendered by the section layout) */}
      <HeaderHydrator title="קטגוריה חדשה" />

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        {/* Left Column */}
        <div className="w-full md:w-1/2 space-y-4">
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
                  className="whitespace-nowrap px-2 cursor-pointer"
                  onClick={() => setCategory((prev) => ({ ...prev, name: "" }))}
                >
                  נקה
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>סוג קטגוריה:</Label>
            <Select value={category.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="collection">אוסף</SelectItem>
                <SelectItem value="sale">מבצע</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {category.type === "sale" && (
            <div className="space-y-3">
              <div>
                <Label>מבצע (למשל 3 ב־30)</Label>
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

              <div className="flex items-center gap-2">
                <input
                  id="showInMenu"
                  name="showInMenu"
                  type="checkbox"
                  checked={category.showInMenu}
                  onChange={handleChange}
                  className="cursor-pointer"
                />
                <Label htmlFor="showInMenu">הצג בתפריט כמו אוסף</Label>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full mt-4 md:mt-6 cursor-pointer">
            צור קטגוריה
          </Button>
        </div>

        {/* Right Column — shared image picker */}
        <aside className="w-full md:w-1/2 space-y-4">
          <ImagePickerPanel
            value={category.image}
            googleQuery={category.name || "ice cream"}
            previewClassName="relative w-full h-80 border rounded-md bg-white"
            onChange={(url) =>
              setCategory((prev) => ({
                ...prev,
                image: url,
                name: prev.name || baseNameFromPicker(url),
              }))
            }
          />
        </aside>
      </form>
    </div>
  );
}
