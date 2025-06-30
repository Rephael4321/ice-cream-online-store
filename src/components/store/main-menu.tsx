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
        const res = await fetch("http://localhost:3001/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    }

    fetchCategories();
  }, []);

  const handleClick = (name: string) => {
    const slug = name.replace(/\s+/g, "-").toLowerCase();
    router.push(`/category-products/${slug}`);
  };

  return (
    <div className="flex flex-col md:flex-row justify-center items-center gap-10 mt-20 px-4 flex-wrap">
      {categories.map((cat) => (
        <div
          key={cat.id}
          onClick={() => handleClick(cat.name)}
          className="cursor-pointer text-center hover:scale-105 transition w-48"
        >
          <div className="flex flex-col gap-4 items-center">
            <Image
              src={cat.image || fallbackImageMap[cat.type] || "/default.png"}
              width={180}
              height={240}
              alt={cat.name}
            />
            <h2
              className={`text-2xl md:text-3xl font-semibold ${
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
