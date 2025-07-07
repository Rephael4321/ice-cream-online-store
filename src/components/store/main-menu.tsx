import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

interface Category {
  id: number;
  name: string;
  type: "brand" | "collection" | "sale";
  image?: string | null;
  description?: string | null;
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

export const metadata: Metadata = {
  title: "קטגוריות | המפנק",
  description: "בחרו קטגוריה מהמגוון שלנו",
};

export default async function MainMenu() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/root`, // ✅ fetch only root categories
    {
      next: { revalidate: 3600 },
    }
  );

  const data = await res.json();
  const categories: Category[] = data.categories || [];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 px-4 py-12">
      {(categories.length === 0 ? Array(6).fill(null) : categories).map(
        (cat, i) => {
          const slug = cat?.name?.replace(/\s+/g, "-").toLowerCase();

          return cat ? (
            <Link
              key={cat.id}
              href={`/category-products/${slug}`}
              className="hover:scale-105 transition-transform duration-200 text-center"
            >
              <div className="bg-white shadow rounded-2xl p-4 flex flex-col items-center space-y-3">
                <div className="w-[120px] h-[120px] relative rounded-md bg-gray-100">
                  <Image
                    src={
                      cat.image || fallbackImageMap[cat.type] || "/default.png"
                    }
                    alt={cat.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100px, 120px"
                  />
                </div>
                <h2
                  className={`text-lg font-semibold ${
                    colorMap[cat.type] || "text-gray-700"
                  }`}
                >
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {cat.description}
                  </p>
                )}
              </div>
            </Link>
          ) : (
            <div
              key={i}
              className="animate-pulse text-center transition-transform duration-200"
            >
              <div className="bg-white shadow rounded-2xl p-4 flex flex-col items-center space-y-3">
                <div className="w-[120px] h-[120px] bg-gray-200 rounded-md" />
                <div className="bg-gray-300 w-1/2 h-4 rounded"></div>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
