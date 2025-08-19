"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/input";
import { showToast } from "@/components/cms/ui/toast";
import { Label } from "@/components/cms/ui/label";
import Link from "next/link";
import Image from "next/image";
import ImageSelector from "@/components/cms/ui/image-selector";
import CategoryLinker from "@/components/cms/entities/sale-group/ui/category-linker";

interface SaleGroupEditorProps {
  id: number;
  initialName: string | null;
  initialPrice: number | null; // regular unit price
  initialQuantity: number | null;
  initialSalePrice: number | null; // sale price per unit
  initialImage: string | null; // full S3 URL or null
  initialCategories: { id: number; name: string }[];
}

const baseName = (url: string) => {
  const file = url.split("/").pop() || "";
  return file.split(".")[0];
};

export function SaleGroupEditor({
  id,
  initialName,
  initialPrice,
  initialQuantity,
  initialSalePrice,
  initialImage,
  initialCategories,
}: SaleGroupEditorProps) {
  const router = useRouter();

  // Committed fields
  const [name, setName] = useState(initialName ?? "");
  const [image, setImage] = useState<string>(initialImage ?? ""); // full S3 URL

  // Image selector state
  const [imageDraft, setImageDraft] = useState<string>(
    initialImage ? baseName(initialImage) : ""
  );
  const [imageItems, setImageItems] = useState<
    { id: number; name: string; image: string }[]
  >([]);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(initialCategories || []);

  // Load S3 image list
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/images");
        if (!res.ok) throw new Error("Failed to load images");
        const paths: string[] = await res.json();

        const items = paths.map((path, idx) => ({
          id: idx,
          name: baseName(path),
          image: path, // full S3 URL
        }));

        // Ensure current image (if any) appears in the list so the selector can show its name
        if (image && !items.find((i) => i.image === image)) {
          items.push({ id: -1, name: baseName(image), image });
        }

        setImageItems(items);
      } catch (e) {
        console.error("Failed to load images", e);
        setImageItems([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fullImagePath = image || "";

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sale-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          image: fullImagePath || null, // full S3 URL (or null)
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
            items={imageItems}
            // Use the draft so the input is typeable
            value={imageDraft}
            onChange={(item) => {
              if (!item) {
                setImageDraft("");
                setImage("");
                return;
              }
              // Free typing path (ImageSelector sends {id:"", name:"typed"})
              // -> update only the draft
              if (!("image" in item) || !item.image) {
                setImageDraft(item.name);
                return;
              }
              // Real selection from list -> commit URL and show its base name
              setImage(item.image); // full S3 URL
              setImageDraft(item.name); // visible label
              setName((prev) => prev || item.name); // convenience: default name if empty
            }}
            // Just echo the draft back into the input
            getDisplayValue={(val) => val}
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
            <Label>מחיר ליחידה</Label>
            <div className="border px-3 py-2 rounded-md bg-gray-100">
              {typeof initialPrice === "number"
                ? `${initialPrice.toFixed(2)} ₪`
                : "לא הוגדר"}
            </div>
          </div>

          <div>
            <Label>מבצע:</Label>
            {typeof initialQuantity === "number" &&
            typeof initialSalePrice === "number" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={initialQuantity}
                  readOnly
                  className="w-1/2 bg-gray-100 text-center cursor-default"
                />
                <span className="text-sm">ב־</span>
                <Input
                  type="number"
                  value={initialSalePrice.toFixed(2)}
                  readOnly
                  className="w-1/2 bg-gray-100 text-center cursor-default"
                />
              </div>
            ) : (
              <div className="border px-3 py-2 rounded-md bg-gray-100 text-center text-gray-500">
                לא הוגדר
              </div>
            )}
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

          <Link
            href={`/sale-groups/${id}/manage-items`}
            className="block w-full"
          >
            <Button
              type="button"
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              disabled={loading}
            >
              ניהול מוצרים בקבוצה
            </Button>
          </Link>
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
