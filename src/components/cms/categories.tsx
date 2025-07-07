"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/cms/ui/button";

type Category = {
  id: number;
  name: string;
  type: "collection" | "sale";
  image: string;
  description: string;
  parent_id: number | null;
  show_in_menu: 0 | 1;
};

type ApiResponse = {
  categories: Category[];
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories?full=true");
        if (!res.ok) throw new Error("Failed to load categories");
        const data: ApiResponse = await res.json();
        setCategories(data.categories || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const handleToggleShowInMenu = async (
    categoryId: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // prevent row click
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
      <h1 className="text-2xl font-bold mb-6 text-center text-purple-700">
        רשימת קטגוריות
      </h1>

      <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
        <table className="min-w-full text-sm sm:text-base text-right border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2 border-b">תמונה</th>
              <th className="px-4 py-2 border-b">שם</th>
              <th className="px-4 py-2 border-b">סוג</th>
              <th className="px-4 py-2 border-b">תיאור</th>
              <th className="px-4 py-2 border-b">אב</th>
              <th className="px-4 py-2 border-b">בתפריט?</th>
              <th className="px-4 py-2 border-b">מוצרים</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr
                key={cat.id}
                onClick={() => router.push(`/categories/${cat.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2 border-t text-center">
                  {cat.image && (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      width={40}
                      height={40}
                      className="object-contain inline-block"
                    />
                  )}
                </td>
                <td className="px-4 py-2 border-t">{cat.name}</td>
                <td className="px-4 py-2 border-t">
                  {cat.type === "sale" ? "מבצע" : "אוסף"}
                </td>
                <td className="px-4 py-2 border-t text-gray-600">
                  {cat.description || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2 border-t text-gray-600">
                  {cat.parent_id ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2 border-t text-center">
                  {cat.show_in_menu ? (
                    <span className="text-green-600 font-bold">✓</span>
                  ) : (
                    <span className="text-red-500 font-bold">✗</span>
                  )}
                </td>
                <td className="px-4 py-2 border-t text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/categories/${cat.id}/products`);
                    }}
                  >
                    הצג מוצרים
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
