"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/cms/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/cms/ui/select";
import { Button } from "@/components/cms/ui/button";

interface Category {
  id: number;
  name: string;
}

interface Props {
  productId: string;
  initialCategories: Category[];
  onUpdate: (newCategories: Category[]) => void;
}

export default function CategorySelector({
  productId,
  initialCategories,
  onUpdate,
}: Props) {
  const [linked, setLinked] = useState<Category[]>(initialCategories);
  const [available, setAvailable] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAvailable() {
      const res = await fetch("/api/categories/root");
      const data = await res.json();
      const filtered = (data.categories || []).filter(
        (cat: Category) => !linked.some((l) => l.id === cat.id)
      );
      setAvailable(filtered);
    }

    fetchAvailable();
  }, [linked]);

  const unlink = async (categoryId: number) => {
    await fetch(
      `/api/product-category?productId=${productId}&categoryId=${categoryId}`,
      { method: "DELETE" }
    );
    const updated = linked.filter((c) => c.id !== categoryId);
    setLinked(updated);
    onUpdate(updated);
  };

  const link = async () => {
    if (!selectedId) return;
    await fetch("/api/product-category", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, categoryId: selectedId }),
    });

    const newCat = available.find((c) => c.id === selectedId);
    if (!newCat) return;

    const updated = [...linked, newCat];
    setLinked(updated);
    setSelectedId(null);
    onUpdate(updated);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>קטגוריות משויכות:</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {linked.map((cat) => (
            <div
              key={cat.id}
              className="bg-gray-100 border px-3 py-1 rounded-full flex items-center gap-2 text-sm"
            >
              {cat.name}
              <button
                type="button"
                className="text-red-500 hover:text-red-700 font-bold"
                onClick={() => unlink(cat.id)}
              >
                ×
              </button>
            </div>
          ))}
          {linked.length === 0 && (
            <p className="text-gray-500">אין קטגוריות משויכות</p>
          )}
        </div>
      </div>

      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
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
              {available.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={link}>
            הוסף
          </Button>
        </div>
      )}
    </div>
  );
}
