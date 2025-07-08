import SingleProduct from "@/components/store/single-product";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

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
  sale?: Sale;
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories?full=true`,
    { cache: "no-store" }
  );
  const data = await res.json();

  return data.categories.map((cat: { name: string }) => ({
    category: cat.name.replace(/\s+/g, "-").toLowerCase(),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeURIComponent(params.category.replace(/-/g, " "));
  return {
    title: `מוצרים מתוך ${name}`,
  };
}

export default async function ProductsByCategory({ params }: Props) {
  const slug = decodeURIComponent(params.category.replace(/-/g, " "));

  // Step 1: Try to fetch subcategories
  const childrenRes = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/name/${slug}/children`,
    { cache: "no-store" }
  );

  const childrenData = await childrenRes.json();
  const children: Category[] = childrenData.children || [];

  if (children.length > 0) {
    return (
      <div className="p-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-pink-700 text-center mb-8">
          {slug}
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

  // Step 2: Fallback to products
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/categories/name/${slug}/products`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return <div className="p-4 text-red-600">שגיאה בטעינת מוצרים</div>;
  }

  const data = await res.json();
  const products: Product[] = data.products || [];

  if (products.length === 0) {
    return <div className="p-4">לא נמצאו מוצרים בקטגוריה.</div>;
  }

  return (
    <>
      <div className="flex justify-center mt-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-700">
          {slug}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 sm:px-8 py-10">
        {products.map((product) => (
          <SingleProduct
            key={product.id}
            id={product.id}
            productImage={product.image || "/ice-scream.png"}
            productName={product.name}
            productPrice={product.price}
            sale={product.sale}
          />
        ))}
      </div>
    </>
  );
}
