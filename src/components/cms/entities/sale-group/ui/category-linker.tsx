"use client";

import { useEffect, useState } from "react";
import {
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
} from "@/components/cms/ui";
import { apiDelete, apiGet, apiPost } from "@/lib/api/client";

type Category = {
  id: number;
  name: string;
};

interface CategoryLinkerProps {
  productId: string;
  initialCategories: Category[];
  disabled?: boolean;
}

export default function CategoryLinker({
  productId,
  initialCategories,
  disabled = false,
}: CategoryLinkerProps) {
  const [linked, setLinked] = useState<Category[] | null>(null);
  const [available, setAvailable] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLinked() {
      try {
        const res = await apiGet(
          `/api/categories/linked?type=sale_group&targetId=${productId}`
        );
        const data = await res.json();
        const linkedCategories = Array.isArray(data.categories)
          ? data.categories
          : [];
        setLinked(linkedCategories);
      } catch (err) {
        console.error("Failed to fetch linked categories:", err);
        setLinked([]);
      }
    }

    fetchLinked();
  }, [productId]);

  useEffect(() => {
    async function fetchAvailable() {
      try {
        const res = await apiGet("/api/categories/root");
        const data = await res.json();
        const all: Category[] = Array.isArray(data.categories)
          ? data.categories
          : [];
        setAvailable(all);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }

    fetchAvailable();
  }, []);

  const link = async () => {
    if (!selectedId || disabled || !linked) return;

    try {
      await apiPost("/api/product-category", {
        targetId: Number(productId),
        categoryId: selectedId,
        type: "sale_group",
      });

      const newCat = available.find((c) => c.id === selectedId);
      if (!newCat) return;

      const updated = [...linked, newCat];
      setLinked(updated);
      setSelectedId(null);
    } catch (err) {
      console.error("Failed to link category:", err);
    }
  };

  const unlink = async (id: number) => {
    if (disabled || !linked) return;

    try {
      await apiDelete(
        `/api/product-category?targetId=${productId}&categoryId=${id}&type=sale_group`
      );

      const updated = linked.filter((c) => c.id !== id);
      setLinked(updated);
    } catch (err) {
      console.error("Failed to unlink category:", err);
    }
  };

  const filteredAvailable = available.filter(
    (cat) => !linked?.some((l) => l.id === cat.id)
  );

  return (
    <div className="space-y-3">
      <div>
        <Label>קטגוריות משויכות:</Label>
        <div className="flex flex-wrap gap-2 mt-2 min-h-[32px]">
          {linked ? (
            linked.length > 0 ? (
              linked.map((cat) => (
                <div
                  key={cat.id}
                  className="bg-gray-100 border px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                >
                  {cat.name}
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 font-bold disabled:opacity-50"
                    onClick={() => unlink(cat.id)}
                    disabled={disabled}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">אין קטגוריות משויכות</p>
            )
          ) : (
            <p className="text-gray-400">טוען קטגוריות...</p>
          )}
        </div>
      </div>

      {filteredAvailable.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            disabled={disabled}
            value={selectedId?.toString() || ""}
            onValueChange={(value) => {
              const num = Number(value);
              if (!isNaN(num)) setSelectedId(num);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר קטגוריה" />
            </SelectTrigger>
            <SelectContent>
              {filteredAvailable.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={link} disabled={disabled}>
            הוסף
          </Button>
        </div>
      )}
    </div>
  );
}
