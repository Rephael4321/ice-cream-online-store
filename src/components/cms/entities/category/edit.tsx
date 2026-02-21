"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/cms/ui/input";
import { Label } from "@/components/cms/ui/label";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import ImagePickerPanel, {
  baseName as baseNameFromPicker,
} from "@/components/cms/shared/image-picker-panel";
import {
  apiDelete,
  apiGet,
  apiPut,
} from "@/lib/api/client";

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
  parent_name: string | null; // send parent by name
  show_in_menu: 0 | 1;
  saleQuantity?: number;
  salePrice?: number;
};

type Props = { name: string }; // only name

export default function EditCategory({ name: initialName }: Props) {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [parentCategories, setParentCategories] = useState<string[]>([]); // names only
  const [selectedParentName, setSelectedParentName] = useState<string | null>(
    null
  );
  const originalNameRef = useRef(initialName); // used for PUT/DELETE route

  // ---- load category + parents (USING NAME ONLY)
  useEffect(() => {
    (async () => {
      try {
        const enc = encodeURIComponent(initialName);

        // Try dedicated by-name endpoint first
        const [detailRes, listRes] = await Promise.all([
          apiGet(`/api/categories/name/${enc}`, { cache: "no-store" }).catch(
            () => null
          ),
          apiGet(`/api/categories?full=true`, { cache: "no-store" }),
        ]);

        const all: { categories: Category[] } = await listRes!.json();
        setParentCategories(
          all.categories.map((c) => c.name).filter((n) => n !== initialName)
        );

        let parsed: Category | null = null;

        if (detailRes && detailRes.ok) {
          const data = await detailRes.json();
          const c = data.category as Category & {
            saleQuantity?: number;
            salePrice?: number;
          };
          parsed = {
            ...c,
            description: c.description || "",
            saleQuantity: c.saleQuantity != null ? String(c.saleQuantity) : "",
            salePrice: c.salePrice != null ? String(c.salePrice) : "",
          };
        } else {
          // Fallback: from the list by name
          const c = all.categories.find((x) => x.name === initialName);
          if (c) {
            parsed = {
              ...c,
              description: c.description || "",
              saleQuantity: "",
              salePrice: "",
            };
          }
        }

        if (!parsed) throw new Error("Category not found");

        // pre-select parent by NAME (derive from list)
        if (parsed.parent_id != null) {
          const parent = all.categories.find((x) => x.id === parsed!.parent_id);
          setSelectedParentName(parent?.name ?? null);
        } else {
          setSelectedParentName(null);
        }

        setCategory(parsed);
      } catch (e) {
        console.error(e);
        showToast("שגיאה בטעינת הקטגוריה", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [initialName]);

  // ---- form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target as any;
    setCategory((prev) =>
      prev
        ? { ...prev, [name]: type === "checkbox" ? (checked ? 1 : 0) : value }
        : prev
    );
  };

  const handleTypeChange = (value: CategoryType) => {
    setCategory((prev) =>
      prev ? { ...prev, type: value, saleQuantity: "", salePrice: "" } : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;

    if (!category.name.trim()) {
      showToast("יש להזין שם קטגוריה", "error");
      return;
    }
    if (category.type === "sale") {
      if (!category.saleQuantity || !category.salePrice) {
        showToast("יש להזין פרטי מבצע תקינים", "error");
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

    const payload: UpdateCategoryPayload = {
      name: category.name.trim(),
      type: category.type,
      image: category.image,
      description: category.description,
      parent_name: selectedParentName,
      show_in_menu: category.show_in_menu,
    };
    if (category.type === "sale") {
      payload.saleQuantity = Number(category.saleQuantity);
      payload.salePrice = Number(category.salePrice);
    }

    try {
      const encOriginal = encodeURIComponent(originalNameRef.current);
      const res = await apiPut(
        `/api/categories/name/${encOriginal}`,
        payload
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "שגיאה בעדכון הקטגוריה");
      }
      showToast("עודכן בהצלחה", "success");

      // If the name changed, update the URL & original name reference
      if (payload.name !== originalNameRef.current) {
        originalNameRef.current = payload.name;
        const newUrl = `/cms/categories/${encodeURIComponent(payload.name)}`;
        window.history.replaceState(null, "", newUrl);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "שגיאה בעדכון", "error");
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק את הקטגוריה?")) return;

    try {
      const encOriginal = encodeURIComponent(originalNameRef.current);
      const res = await apiDelete(`/api/categories/name/${encOriginal}`);
      if (!res.ok) throw new Error();
      showToast("הקטגוריה נמחקה בהצלחה", "success");
      window.location.href = "/categories";
    } catch {
      showToast("שגיאה בעת מחיקת הקטגוריה", "error");
    }
  };

  if (loading) return <div className="p-4">טוען...</div>;
  if (!category)
    return <div className="p-4 text-red-600">לא נמצאה קטגוריה</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base">
      {/* Shared header title (rendered by the section layout) */}
      <HeaderHydrator
        title={`עריכת קטגוריה — ${category.name || initialName}`}
      />

      <form
        onSubmit={handleSubmit}
        className="flex flex-col md:flex-row gap-6 items-start"
      >
        {/* LEFT */}
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <Label>שם הקטגוריה:</Label>
            <div className="flex gap-2">
              <Input
                name="name"
                value={category.name || ""}
                onChange={handleChange}
              />
              {!!category.name && (
                <Button
                  type="button"
                  variant="outline"
                  className="px-2"
                  onClick={() =>
                    setCategory((p) => (p ? { ...p, name: "" } : p))
                  }
                >
                  נקה
                </Button>
              )}
            </div>
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
                  min="1"
                />
                <span className="text-sm">ב־</span>
                <Input
                  name="salePrice"
                  type="number"
                  value={category.salePrice ?? ""}
                  onChange={handleChange}
                  placeholder="מחיר"
                  className="w-1/2"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <div>
            <Label>קטגוריית אב:</Label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedParentName ?? ""}
              onChange={(e) => setSelectedParentName(e.target.value || null)}
            >
              <option value="">— ללא —</option>
              {parentCategories.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" className="w-full mt-4">
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

        {/* RIGHT — shared image picker */}
        <aside className="w-full md:w-1/2 space-y-4">
          <ImagePickerPanel
            value={category.image || ""}
            googleQuery={category.name || "ice cream"}
            previewClassName="relative w-full h-80 border rounded-md bg-white"
            onChange={(url) =>
              setCategory((prev) =>
                prev
                  ? {
                      ...prev,
                      image: url,
                      // only auto-fill name if empty
                      name: prev.name || baseNameFromPicker(url),
                    }
                  : prev
              )
            }
          />
        </aside>
      </form>
    </div>
  );
}
