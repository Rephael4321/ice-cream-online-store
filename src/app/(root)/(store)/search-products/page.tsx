import { notFound } from "next/navigation";
import SingleProduct from "@/components/store/single-product";
import BackButton from "@/components/store/search-products/back-button";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  in_stock: boolean;
  sale_quantity: number | null;
  sale_price: number | null;
};

export const dynamic = "force-dynamic";

async function getResults(query: string): Promise<Product[]> {
  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_SITE_URL
    }/api/products/search?query=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch search results");
  }

  const data = await res.json();
  return data.products || [];
}

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query?.trim();
  if (!query) return notFound();

  const results = await getResults(query);

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-12">
      <BackButton />

      <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        תוצאות חיפוש עבור: "{query}"
      </h1>

      {results.length === 0 ? (
        <p className="text-center text-gray-500">לא נמצאו מוצרים תואמים.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((product) => (
            <SingleProduct
              key={product.id}
              id={product.id}
              productImage={product.image}
              productName={product.name}
              productPrice={Number(product.price)}
              inStock={product.in_stock}
              sale={
                product.sale_quantity && product.sale_price
                  ? {
                      amount: product.sale_quantity,
                      price: Number(product.sale_price),
                      fromCategory: false,
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
