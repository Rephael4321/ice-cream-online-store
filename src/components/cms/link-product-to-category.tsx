"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

interface Product {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface ProductResponse {
  products: Product[];
}

interface CategoryResponse {
  categories: Category[];
}

export default function LinkProductToCategory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");

  useEffect(() => {
    async function fetchProducts() {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("שגיאה בטעינת מוצרים");
      const data: ProductResponse | Product[] = await res.json();
      const result = Array.isArray(data) ? data : data.products;
      setProducts(result.reverse());
    }

    async function fetchCategories() {
      const res = await fetch("/api/categories?full=true");
      if (!res.ok) throw new Error("שגיאה בטעינת קטגוריות");
      const data: CategoryResponse | Category[] = await res.json();
      const result = Array.isArray(data) ? data : data.categories;
      setCategories(result.reverse());
    }

    fetchProducts().catch(console.error);
    fetchCategories().catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProductId === "" || selectedCategoryId === "") {
      alert("אנא בחר מוצר וקטגוריה");
      return;
    }

    try {
      const response = await fetch("/api/product-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          categoryId: selectedCategoryId,
        }),
      });

      if (!response.ok) {
        const errData: { error?: string } = await response.json();
        throw new Error(errData.error || "שגיאה בקישור מוצר לקטגוריה");
      }

      alert("המוצר קושר בהצלחה!");
      setSelectedProductId("");
      setSelectedCategoryId("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("אירעה שגיאה לא ידועה");
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">קישור מוצר לקטגוריה</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="product">מוצר</Label>
          <select
            id="product"
            value={selectedProductId}
            onChange={(e) =>
              setSelectedProductId(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            required
            className="w-full border rounded p-2"
          >
            <option value="">בחר מוצר</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="category">קטגוריה</Label>
          <select
            id="category"
            value={selectedCategoryId}
            onChange={(e) =>
              setSelectedCategoryId(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            required
            className="w-full border rounded p-2"
          >
            <option value="">בחר קטגוריה</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="w-full cursor-pointer">
          קשר מוצר לקטגוריה
        </Button>
      </form>
    </div>
  );
}
