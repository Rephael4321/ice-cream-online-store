import { Metadata } from "next";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import Image from "next/image";
import Link from "next/link";

interface Category {
  id: number;
  name: string;
  type: "collection" | "sale";
  image?: string | null;
  description?: string | null;
}

const fallbackImageMap: Record<string, string> = {
  collection: "/popsicle.png",
  sale: "/sale.png",
};

const colorMap: Record<string, string> = {
  collection: "text-blue-600",
  sale: "text-green-600",
};

export const metadata: Metadata = {
  title: "קטגוריות | המפנק",
  description: "בחרו קטגוריה מהמגוון שלנו",
};

export default async function MainMenu() {
  const cookie = cookies();
  const token = (await cookie).get("token")?.value;
  const isAdmin = !!(token && verifyJWT(token));

  let categories: Category[] = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/root`,
      { cache: "no-store" }
    );

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok || !contentType.includes("application/json")) {
      const raw = await res.text();
      console.warn("⚠️ Non-JSON response received:", raw.slice(0, 200));
      throw new Error("Invalid API response");
    }

    const data = await res.json();
    categories = data.categories || [];
  } catch (err) {
    console.error("❌ Failed to load categories:", err);
  }

  return (
    <div className="px-4 py-12">
      {/* 🔶 Top Message Banner */}
      <div className="text-center bg-yellow-100 text-yellow-800 font-semibold py-2 rounded-md shadow mb-6">
        המוצרים נמכרים ביחידות בודדות בלבד. ההנחה חלה רק כאשר מוסיפים את כמות
        המבצע!
      </div>

      {/* 🔄 Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {(categories.length === 0 ? Array(6).fill(null) : categories).map(
          (cat, i) => {
            const slug = cat?.name?.replace(/\s+/g, "-").toLowerCase();

            return cat ? (
              <div
                key={cat.id}
                className="relative hover:scale-105 transition-transform duration-200 text-center"
              >
                <Link href={`/category-products/${slug}`} className="block">
                  <div className="bg-white shadow rounded-2xl p-4 flex flex-col items-center space-y-3">
                    <div className="w-[120px] h-[120px] relative rounded-md bg-gray-100">
                      <Image
                        src={
                          cat.image ||
                          fallbackImageMap[cat.type] ||
                          "/default.png"
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

                {isAdmin && (
                  <Link
                    href={`/categories/${cat.id}`}
                    className="absolute top-2 left-2 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 shadow"
                  >
                    ערוך
                  </Link>
                )}
              </div>
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
    </div>
  );
}
