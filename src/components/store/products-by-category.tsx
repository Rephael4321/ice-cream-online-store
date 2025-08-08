import { Metadata } from "next";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import SingleProduct from "@/components/store/single-product";
import SaleGroupCard from "@/components/store/ui/sale-group-card";
import Image from "next/image";
import Link from "next/link";

export interface Props {
  params: { category: string };
}

interface Category {
  id: number;
  name: string;
  image?: string;
  description?: string;
}

interface CategoryRef {
  id: number;
  name: string;
}

interface Sale {
  amount: number;
  price: number;
  fromCategory?: boolean;
  category?: CategoryRef;
}

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  inStock: boolean;
  sale?: Sale;
}

interface SaleGroup {
  id: number;
  name: string;
  image: string | null;
  quantity: number | null;
  salePrice: number | null;
  price: number | null;
  items: {
    id: number;
    name: string;
    image: string;
    label: string | null;
    color: string | null;
  }[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeURIComponent(params.category).replace(/-/g, " ");
  return {
    title: `מוצרים מתוך ${name}`,
  };
}

export default async function ProductsByCategory({ params }: Props) {
  const raw = decodeURIComponent(params.category);
  const slug = raw
    .trim()
    .replace(/[\s\u05BE\u2012\u2013\u2014\u2015\u2212]+/g, "-")
    .replace(/-+/g, "-");

  const displayName = raw.replace(/-/g, " ");

  const cookie = cookies();
  const token = (await cookie).get("token")?.value;
  const isAdmin = !!(token && verifyJWT(token));

  const childrenRes = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/name/${displayName}/children`,
    { cache: "no-store" }
  );
  const childrenData = await childrenRes.json();
  const children: Category[] = childrenData.children || [];

  if (children.length > 0) {
    return (
      <div className="p-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-pink-700 text-center mb-8">
          {displayName}
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {children.map((cat) => (
            <Link
              key={cat.id}
              href={`/category-products/${cat.name
                .replace(/\s+/g, "-")
                .toLowerCase()}`}
              className="hover:scale-105 transition-transform duration-200 text-center"
            >
              <div className="bg-white shadow rounded-2xl p-4 flex flex-col items-center space-y-3">
                <div className="w-[120px] h-[120px] relative rounded-md bg-gray-100">
                  <Image
                    src={cat.image || "/ice-scream.png"}
                    alt={cat.name}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100px, 120px"
                  />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {cat.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // 🔹 Fetch products & sale groups for this category
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/name/${displayName}/products`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    console.error(
      "❌ [ProductsByCategory] Failed to fetch products:",
      res.status,
      res.statusText
    );
    return <div className="p-4 text-red-600">שגיאה בטעינת מוצרים</div>;
  }

  const data = await res.json();
  const products: Product[] = data.products || [];
  const saleGroups: SaleGroup[] = Array.isArray(data.saleGroups)
    ? data.saleGroups
    : [];

  const visibleSaleGroups = saleGroups.filter(
    (g) =>
      g.salePrice != null &&
      typeof g.salePrice === "number" &&
      g.quantity != null &&
      typeof g.quantity === "number"
  );

  if (products.length === 0 && visibleSaleGroups.length === 0) {
    console.warn(
      "⚠️ [ProductsByCategory] No products or visible sale groups found for category:",
      slug
    );
    return <div className="p-4">לא נמצאו מוצרים בקטגוריה.</div>;
  }

  return (
    <>
      <div className="flex justify-center mt-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-700">
          {displayName}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 sm:px-8 py-10">
        {visibleSaleGroups.map((group) => (
          <SaleGroupCard key={`sg-${group.id}`} {...group} />
        ))}

        {products.map((product) => (
          <SingleProduct
            key={`p-${product.id}`}
            id={product.id}
            productImage={product.image || "/ice-scream.png"}
            productName={product.name}
            productPrice={product.price}
            inStock={product.inStock}
            sale={product.sale}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </>
  );
}
