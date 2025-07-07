"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Product = {
  id: number;
  name: string;
  image: string;
  has_category: boolean;
  categories: string[];
};

export default function SaleGroups() {
  const [groups, setGroups] = useState<Record<string, Product[]>>({});
  const [onlyWithCategory, setOnlyWithCategory] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    fetch("/api/products/by-sale")
      .then((res) => res.json())
      .then(setGroups);
  }, []);

  const filteredGroups = Object.entries(groups).reduce(
    (acc, [label, products]) => {
      const filtered = onlyWithCategory
        ? products.filter((p) => p.has_category)
        : products;
      if (filtered.length > 0) acc[label] = filtered;
      return acc;
    },
    {} as Record<string, Product[]>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-end gap-4 mb-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setOnlyWithCategory((v) => !v)}
        >
          {onlyWithCategory ? "הצג הכל" : "הצג רק עם קטגוריה"}
        </button>
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          onClick={() => setCompactMode((v) => !v)}
        >
          {compactMode ? "תצוגה רגילה" : "תצוגה קומפקטית"}
        </button>
      </div>

      <h1 className="text-2xl font-bold text-right">מוצרים מקובצים לפי מבצע</h1>

      {Object.entries(filteredGroups).map(([label, products]) => (
        <div key={label} className="border rounded-xl p-4 shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-4">{label}</h2>
          <div
            className={`grid ${
              compactMode
                ? "grid-cols-3 md:grid-cols-6"
                : "grid-cols-2 md:grid-cols-4"
            } gap-4`}
          >
            {products.map((p) => (
              <div
                key={p.id}
                className={`border rounded shadow bg-gray-50 flex flex-col items-center ${
                  compactMode ? "p-1" : "p-2"
                }`}
              >
                <div
                  className={`w-full relative rounded overflow-hidden ${
                    compactMode ? "h-16" : "h-24"
                  }`}
                >
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <p
                  className={`text-center mt-1 font-medium ${
                    compactMode ? "text-xs" : "text-sm"
                  }`}
                >
                  {p.name}
                </p>

                {p.categories.length > 0 && (
                  <ul
                    className={`text-gray-600 mt-1 text-center ${
                      compactMode ? "text-[10px]" : "text-xs"
                    }`}
                  >
                    {p.categories.map((cat, i) => (
                      <li key={i}>{cat}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
