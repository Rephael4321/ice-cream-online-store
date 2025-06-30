"use client";

import { useEffect, useState } from "react";
import SingleProduct from "@/components/single-product";

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  saleQuantity?: number;
  salePrice?: number;
}

export default function ProductsByCategory({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { category } = await params;
        setCategorySlug(category);

        const res = await fetch(
          `http://localhost:3001/api/categories/name/${category}/products`
        );
        if (!res.ok) throw new Error("Failed to fetch products");

        const data = await res.json();
        setProducts(data.products || []);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [params]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (products.length === 0)
    return <div className="p-4">No products found.</div>;

  return (
    <>
      <div className="flex justify-center mt-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-700">
          {categorySlug.replace(/-/g, " ")}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4 sm:px-8 py-10">
        {products.map((product) => (
          <SingleProduct
            key={product.id}
            productImage={product.image || ""}
            productName={product.name}
            productPrice={product.price}
            sale={
              product.saleQuantity && product.salePrice
                ? {
                    amount: product.saleQuantity,
                    price: product.salePrice,
                  }
                : undefined
            }
          />
        ))}
      </div>
    </>
  );
}
