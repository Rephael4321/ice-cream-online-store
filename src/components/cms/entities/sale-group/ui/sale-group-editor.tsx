"use client";

import { useState } from "react";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/input";
import { showToast } from "@/components/cms/ui/toast";
import { images } from "@/data/images";
import { Label } from "@/components/cms/ui/label";
import Image from "next/image";
import ImageSelector from "@/components/cms/ui/image-selector";
import CategoryLinker from "@/components/cms/entities/sale-group/ui/category-linker";

interface SaleGroupEditorProps {
  id: number;
  initialName: string | null;
  initialPrice: number | null;
  initialQuantity: number | null;
  initialSalePrice: number | null;
  initialImage: string | null;
  initialCategories: { id: number; name: string }[];
}

function getDisplayName(path: string) {
  const file = path.split("/").pop() || "";
  return file.split(".")[0];
}

export function SaleGroupEditor({
  id,
  initialName,
  initialPrice,
  initialQuantity,
  initialSalePrice,
  initialImage,
  initialCategories,
}: SaleGroupEditorProps) {
  const [name, setName] = useState(initialName ?? "");
  const [image, setImage] = useState(getDisplayName(initialImage || ""));
  const [imagePathMap, setImagePathMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState(initialCategories || []);

  const fullImagePath =
    imagePathMap[image] ||
    images.find((img) => getDisplayName(img) === image) ||
    "";

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sale-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          image: fullImagePath || null,
        }),
      });

      if (!res.ok) throw new Error();
      showToast("קבוצת מבצע עודכנה בהצלחה", "success");
    } catch {
      showToast("אירעה שגיאה בעדכון הקבוצה", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("האם אתה בטוח שברצונך למחוק את קבוצת המבצע?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sale-groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("קבוצת המבצע נמחקה", "success");
      window.location.href = "/sale-groups";
    } catch {
      showToast("שגיאה במחיקת הקבוצה", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="max-w-5xl mx-auto p-4 sm:p-6 text-sm sm:text-base"
    >
      <div className="relative flex flex-col md:flex-row gap-6 items-start">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center rounded-md">
            <span className="text-xl font-semibold">שומר...</span>
          </div>
        )}

        {/* Left Column */}
        <div className="w-full md:w-1/2 space-y-4">
          <ImageSelector
            items={images.map((path, index) => ({
              id: index,
              name: getDisplayName(path),
              image: path,
            }))}
            value={image}
            onChange={(item) => {
              setImage(item?.name || "");
              if (item?.name && item.image) {
                setImagePathMap((prev) => ({
                  ...prev,
                  [item.name]: item.image,
                }));
              }
            }}
            disabled={loading}
          />

          <CategoryLinker
            productId={id.toString()}
            initialCategories={categories}
            disabled={loading}
          />

          <div>
            <Label htmlFor="name">שם הקבוצה</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label>פרטי מבצע</Label>
            <div className="border px-3 py-2 rounded-md bg-gray-100">
              {initialQuantity && initialSalePrice != null ? (
                <>
                  {initialQuantity} ב־ {initialSalePrice.toFixed(2)} ₪
                </>
              ) : (
                "לא הוגדר"
              )}
            </div>
          </div>

          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? "שומר..." : "שמור שינויים"}
          </Button>

          <Button
            type="button"
            className="w-full bg-red-600 text-white hover:bg-red-700"
            onClick={handleDelete}
            disabled={loading}
          >
            מחק קבוצה
          </Button>
        </div>

        {/* Right Column - Image Preview */}
        <div className="w-full md:w-1/2">
          {fullImagePath && (
            <div className="relative w-full h-96 border rounded-md">
              <Image
                src={fullImagePath}
                alt="תצוגת תמונה"
                fill
                className="object-contain rounded-md"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
