"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Category {
  id: number;
  name: string;
  type: "brand" | "collection" | "sale";
  image?: string;
}

const fallbackImageMap: Record<string, string> = {
  brand: "/ice-scream.png",
  collection: "/popsicle.png",
  sale: "/sale.png",
};

const colorMap: Record<string, string> = {
  brand: "text-pink-700",
  collection: "text-blue-600",
  sale: "text-green-600",
};

export default function MainMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("ארעה תקלה בטעינת קטגוריות");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error("תקלה בטעינת קטגוריות:", err);
      }
    }

    fetchCategories();
  }, []);

  const handleClick = (name: string) => {
    const slug = name.replace(/\s+/g, "-").toLowerCase();
    router.push(`/category-products/${slug}`);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 px-4 py-12">
      {categories.map((cat) => (
        <div
          key={cat.id}
          onClick={() => handleClick(cat.name)}
          className="cursor-pointer text-center hover:scale-105 transition-transform duration-200"
        >
          <div className="bg-white shadow rounded-2xl p-4 flex flex-col items-center space-y-3">
            <div className="w-[120px] h-[120px] relative rounded-md bg-white">
              <Image
                src={cat.image || fallbackImageMap[cat.type] || "/default.png"}
                alt={cat.name}
                fill
                className="object-contain"
              />
            </div>
            <h2
              className={`text-lg font-semibold ${
                colorMap[cat.type] || "text-gray-700"
              }`}
            >
              {cat.name}
            </h2>
          </div>
        </div>
      ))}
    </div>
  );
}
