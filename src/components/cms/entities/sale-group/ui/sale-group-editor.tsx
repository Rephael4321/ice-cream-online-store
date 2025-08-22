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

type SelectorItem = { id: number; name: string; image: string };

// ✅ Robust base name extractor with decodeURIComponent
function baseNameFromUnknown(input: unknown): string {
  const url =
    typeof input === "string"
      ? input
      : input && typeof (input as any).image === "string"
      ? (input as any).image
      : input && typeof (input as any).url === "string"
      ? (input as any).url
      : "";

  if (!url) return "";

  const clean = url.split(/[?#]/)[0];
  const encodedFile = clean.split("/").pop() ?? "";

  try {
    const decoded = decodeURIComponent(encodedFile);
    const dot = decoded.lastIndexOf(".");
    return dot === -1 ? decoded : decoded.slice(0, dot);
  } catch {
    // fallback if decoding fails
    const dot = encodedFile.lastIndexOf(".");
    return dot === -1 ? encodedFile : encodedFile.slice(0, dot);
  }
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
  const router = useRouter();

  const [name, setName] = useState(initialName ?? "");
  const [image, setImage] = useState<string>(initialImage ?? ""); // full S3 URL

  const [imageDraft, setImageDraft] = useState<string>(
    baseNameFromUnknown(initialImage)
  );
  const [imageItems, setImageItems] = useState<SelectorItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(initialCategories || []);

  // Load S3 image list
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/images");
        if (!res.ok) throw new Error("Failed to load images");
        const data: unknown = await res.json();

        const items: SelectorItem[] = Array.isArray(data)
          ? (data
              .map((entry, idx) => {
                if (typeof entry === "string") {
                  return {
                    id: idx,
                    name: baseNameFromUnknown(entry),
                    image: entry,
                  };
                }
                if (entry && typeof entry === "object") {
                  const obj = entry as any;
                  const url: string =
                    typeof obj.url === "string"
                      ? obj.url
                      : typeof obj.image === "string"
                      ? obj.image
                      : "";
                  if (!url) return null;
                  const name: string =
                    typeof obj.name === "string" && obj.name
                      ? obj.name
                      : baseNameFromUnknown(url);
                  return { id: idx, name, image: url };
                }
                return null;
              })
              .filter(Boolean) as SelectorItem[])
          : [];

        if (image && !items.find((i) => i.image === image)) {
          items.push({
            id: -1,
            name: baseNameFromUnknown(image),
            image,
          });
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
            items={imageItems}
            value={imageDraft}
            onChange={(item: any) => {
              if (!item) {
                setImageDraft("");
                setImage("");
                return;
              }
              if (
                typeof item !== "object" ||
                !("image" in item) ||
                !item.image
              ) {
                const typed =
                  typeof item === "string" ? item : item?.name ?? "";
                setImageDraft(typed);
                return;
              }
              const pickedUrl: string = item.image;
              const pickedName: string =
                item.name || baseNameFromUnknown(pickedUrl);
              setImage(pickedUrl);
              setImageDraft(pickedName);
              setName((prev) => prev || pickedName);
            }}
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
