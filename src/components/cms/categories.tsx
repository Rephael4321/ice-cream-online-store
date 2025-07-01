"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/cms/ui/button";

type Category = {
  id: number;
  name: string;
  type: string;
  image: string;
  description: string;
  parent_id: number | null;
  show_in_menu: number;
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories?full=true");
        if (!res.ok) throw new Error("Failed to load categories");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const handleToggleShowInMenu = async (categoryId: number) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_in_menu: true }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === categoryId ? { ...cat, show_in_menu: 1 } : cat
        )
      );
    } catch (err) {
      alert("שגיאה בעדכון הקטגוריה");
      console.error(err);
    }
  };

  if (loading) return <div className="p-4">טוען...</div>;
  if (error) return <div className="p-4 text-red-600">שגיאה: {error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">רשימת קטגוריות</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse border border-gray-300 text-sm sm:text-base">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">תמונה</th>
              <th className="border px-2 py-1">שם</th>
              <th className="border px-2 py-1">סוג</th>
              <th className="border px-2 py-1">תיאור</th>
              <th className="border px-2 py-1">אב</th>
              <th className="border px-2 py-1">בתפריט?</th>
              <th className="border px-2 py-1">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="text-center">
                <td className="border px-2 py-1">
                  {cat.image && (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  )}
                </td>
                <td className="border px-2 py-1">{cat.name}</td>
                <td className="border px-2 py-1">{cat.type}</td>
                <td className="border px-2 py-1">
                  {cat.description || <span className="text-gray-400">—</span>}
                </td>
                <td className="border px-2 py-1">
                  {cat.parent_id ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="border px-2 py-1">
                  {cat.show_in_menu ? "✓" : "✗"}
                </td>
                <td className="border px-2 py-1 space-y-1">
                  <Button size="sm" variant="outline" disabled>
                    עריכה
                  </Button>

                  {cat.type === "sale" && !cat.show_in_menu && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleShowInMenu(cat.id)}
                    >
                      הפוך לקטגוריה גלויה
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
