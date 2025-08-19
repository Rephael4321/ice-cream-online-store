"use client";

import { useEffect, useState } from "react";
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
import Image from "next/image";
import ImageSelector from "@/components/cms/ui/image-selector";

type CategoryForm = {
  name: string;
  type: "collection" | "sale";
  image: string; // full S3 URL (or "")
  saleQuantity: string;
  salePrice: string;
  showInMenu: boolean;
};

type CategoryPayload = {
  name: string;
  type: "collection" | "sale";
  image: string; // send full URL to backend
  saleQuantity?: number;
  salePrice?: number;
  show_in_menu?: boolean;
};

export default function NewCategory() {
  const [category, setCategory] = useState<CategoryForm>({
    name: "",
    type: "collection",
    image: "", // full URL (or empty)
    saleQuantity: "",
    salePrice: "",
    showInMenu: false,
  });

  const [imageItems, setImageItems] = useState<
    { id: number; name: string; image: string }[]
  >([]);

  // NEW: text shown/typed in the selector input (filename without extension)
  const [imageDraft, setImageDraft] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/images");
        if (!res.ok) throw new Error("failed");
        const paths: string[] = await res.json();

        const items = paths.map((path, idx) => {
          const file = path.split("/").pop() || "";
          const name = file.split(".")[0];
          return { id: idx, name, image: path };
        });

        // if a prefilled URL exists, ensure it's in the list so its name can show
        if (category.image && !items.find((i) => i.image === category.image)) {
          const file = category.image.split("/").pop() || "";
          const name = file.split(".")[0];
          items.push({ id: -1, name, image: category.image });
          // also reflect that in the draft field
          setImageDraft(name);
        }

        setImageItems(items);
      } catch (e) {
        console.error("Failed to load images", e);
        setImageItems([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategory((prev) => ({ ...prev, [name]: value }));
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

  const toggleShowInMenu = () => {
    setCategory((prev) => ({ ...prev, showInMenu: !prev.showInMenu }));
  };

  const previewSrc = category.image || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category.name.trim()) {
      alert("נא להזין שם קטגוריה");
      return;
    }

    if (
      category.type === "sale" &&
      (!category.saleQuantity || !category.salePrice)
    ) {
      alert("נא למלא כמות ומחיר מבצע");
      return;
    }

    const payload: CategoryPayload = {
      name: category.name,
      type: category.type,
      image: category.image, // already a full S3 URL
    };

    if (category.type === "sale") {
      payload.saleQuantity = Number(category.saleQuantity);
      payload.salePrice = Number(category.salePrice);
      payload.show_in_menu = category.showInMenu;
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
      alert("שמר בהצלחה עם מזהה: " + data.categoryId);

      setCategory({
        name: "",
        type: "collection",
        image: "",
        saleQuantity: "",
        salePrice: "",
        showInMenu: false,
      });
      setImageDraft("");
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
        {/* Left Column */}
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            items={imageItems}
            value={imageDraft /* typeable text */}
            onChange={(item) => {
              if (!item) {
                setImageDraft("");
                setCategory((prev) => ({ ...prev, image: "" }));
                return;
              }
              // free typing path => selector sends { id:"", name:"typed" } without image url
              if (!("image" in item) || !item.image) {
                setImageDraft(item.name);
                return;
              }
              // selection from list => commit the URL, show its name
              setCategory((prev) => ({
                ...prev,
                image: item.image, // full S3 URL
                name: prev.name || item.name,
              }));
              setImageDraft(item.name);
            }}
            // display the file "name" even though the stored value is a URL
            getDisplayValue={(val) => val}
            placeholder="ארטיקים"
            label="שם תמונה"
          />

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
                  type="checkbox"
                  checked={category.showInMenu}
                  onChange={toggleShowInMenu}
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
