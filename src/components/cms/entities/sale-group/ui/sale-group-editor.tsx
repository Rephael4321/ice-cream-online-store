"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/input";
import { showToast } from "@/components/cms/ui/toast";
import { Label } from "@/components/cms/ui/label";
import Link from "next/link";
import CategoryLinker from "@/components/cms/entities/sale-group/ui/category-linker";

interface SaleGroupEditorProps {
  id: number;
  initialName: string | null;
  initialPrice: number | null; // regular unit price
  initialQuantity: number | null;
  initialSalePrice: number | null; // sale price per unit
  initialImage: string | null; // kept for API symmetry (not edited here)
  initialCategories: { id: number; name: string }[];
}

export function SaleGroupEditor({
  id,
  initialName,
  initialPrice,
  initialQuantity,
  initialSalePrice,
  initialImage, // eslint-disable-line @typescript-eslint/no-unused-vars
  initialCategories,
}: SaleGroupEditorProps) {
  const router = useRouter();

  const [name, setName] = useState(initialName ?? "");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState(initialCategories || []);

  const handleSave = async () => {
    setLoading(true);
    try {
      // send only what this editor controls (avoid clobbering image)
      const res = await fetch(`/api/sale-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
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
      <div className="relative flex flex-col gap-4">
        {/* Categories */}
        <CategoryLinker
          productId={id.toString()}
          initialCategories={categories}
          disabled={loading}
        />

        {/* Name */}
        <div>
          <Label htmlFor="name">שם הקבוצה</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Price (read-only summary) */}
        <div>
          <Label>מחיר ליחידה</Label>
          <div className="border px-3 py-2 rounded-md bg-gray-100">
            {typeof initialPrice === "number"
              ? `${initialPrice.toFixed(2)} ₪`
              : "לא הוגדר"}
          </div>
        </div>

        {/* Sale (read-only summary) */}
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

        {/* Actions */}
        <Button type="submit" className="w-full mt-2" disabled={loading}>
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

        <Link href={`/sale-groups/${id}/manage-items`} className="block w-full">
          <Button
            type="button"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
            disabled={loading}
          >
            ניהול מוצרים בקבוצה
          </Button>
        </Link>
      </div>
    </form>
  );
}
