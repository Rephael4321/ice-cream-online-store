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

export default function LinkProductToCategory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");

  useEffect(() => {
    async function fetchProducts() {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products);
    }

    async function fetchCategories() {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data.categories);
    }

    fetchProducts().catch(console.error);
    fetchCategories().catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProductId === "" || selectedCategoryId === "") {
      alert("Please select both product and category");
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
        const errData = await response.json();
        throw new Error(errData.error || "Failed to link product and category");
      }

      alert("Product linked to category successfully!");
      setSelectedProductId("");
      setSelectedCategoryId("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">
        Link Product to Category
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="product">Product</Label>
          <select
            id="product"
            value={selectedProductId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedProductId(val === "" ? "" : Number(val));
            }}
            required
            className="w-full border rounded p-2"
          >
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={selectedCategoryId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCategoryId(val === "" ? "" : Number(val));
            }}
            required
            className="w-full border rounded p-2"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="w-full cursor-pointer">
          Link Product to Category
        </Button>
      </form>
    </div>
  );
}
