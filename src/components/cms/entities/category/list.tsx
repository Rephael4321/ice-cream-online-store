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

export default function ListCategory() {
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

  if (loading) return <div className="p-4">טוען...</div>;
  if (error) return <div className="p-4 text-red-600">שגיאה: {error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center text-purple-700">
        רשימת קטגוריות
      </h1>

      {categories.length === 0 ? (
        <p className="text-center text-gray-500">אין קטגוריות.</p>
      ) : (
        <div className="grid gap-4 sm:table w-full">
          {/* Desktop Table */}
          <table className="hidden sm:table min-w-full text-sm sm:text-base text-right border-collapse">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 border-b">תמונה</th>
                <th className="px-4 py-2 border-b">מוצרים</th>
                <th className="px-4 py-2 border-b">שם</th>
                <th className="px-4 py-2 border-b">סוג</th>
                <th className="px-4 py-2 border-b">תיאור</th>
                <th className="px-4 py-2 border-b">אב</th>
                <th className="px-4 py-2 border-b">בתפריט?</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 border-t text-center">
                    <div
                      className="w-16 h-16 mx-auto relative cursor-pointer"
                      onClick={() => router.push(`/categories/${cat.id}`)}
                    >
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        className="object-contain rounded-md"
                        sizes="64px"
                      />
                    </div>
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
                  <td className="px-4 py-2 border-t">{cat.name}</td>
                  <td className="px-4 py-2 border-t">
                    {cat.type === "sale" ? "מבצע" : "אוסף"}
                  </td>
                  <td className="px-4 py-2 border-t text-gray-600">
                    {cat.description || (
                      <span className="text-gray-400">—</span>
                    )}
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
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="border rounded-lg p-4 shadow flex flex-col gap-2"
              >
                <div
                  className="w-full h-40 relative cursor-pointer"
                  onClick={() => router.push(`/categories/${cat.id}`)}
                >
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-contain rounded-md"
                  />
                </div>
                <div>
                  <strong>שם:</strong> {cat.name}
                </div>
                <div>
                  <strong>סוג:</strong> {cat.type === "sale" ? "מבצע" : "אוסף"}
                </div>
                <div>
                  <strong>תיאור:</strong> {cat.description || "—"}
                </div>
                <div>
                  <strong>אב:</strong> {cat.parent_id ?? "—"}
                </div>
                <div>
                  <strong>בתפריט?</strong>{" "}
                  {cat.show_in_menu ? (
                    <span className="text-green-600 font-bold">✓</span>
                  ) : (
                    <span className="text-red-500 font-bold">✗</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/categories/${cat.id}/products`)}
                >
                  הצג מוצרים
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
