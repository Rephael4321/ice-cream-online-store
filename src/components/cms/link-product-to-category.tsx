"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "./ui/button";
import ImageSelector, { BaseItem } from "./ui/image-selector";

interface Product {
  id: number;
  name: string;
  image?: string;
  createdAt?: string;
}

interface Category {
  id: number;
  name: string;
  image?: string;
  createdAt?: string;
}

type CombinedItem = BaseItem;

export default function LinkProductToCategory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItem, setSelectedItem] = useState<CombinedItem | null>(null);
  const [selectedCategoryImage, setSelectedCategoryImage] =
    useState<string>("");

  useEffect(() => {
    async function fetchData() {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories?full=true"),
      ]);

      if (!productsRes.ok || !categoriesRes.ok) {
        alert("שגיאה בטעינת מוצרים או קטגוריות");
        return;
      }

      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();

      const productList: Product[] = Array.isArray(productsData)
        ? productsData
        : productsData.products;

      const categoryList: Category[] = Array.isArray(categoriesData)
        ? categoriesData
        : categoriesData.categories;

      setProducts(productList.reverse());
      setCategories(categoryList.reverse());
    }

    fetchData().catch(console.error);
  }, []);

  const combinedItems: CombinedItem[] = [
    ...products.map((p) => ({
      id: `product-${p.id}`,
      name: p.name,
      image: p.image,
    })),
    ...categories.map((c) => ({
      id: `category-${c.id}`,
      name: c.name,
      image: c.image,
    })),
  ];

  const extractId = (strId: string | number): number => {
    if (typeof strId === "number") return strId;
    const parts = strId.split("-");
    return Number(parts[1]) || 0;
  };

  const categoryNameToImage = (name: string): string | undefined => {
    const category = categories.find((c) => c.name === name);
    return category?.image;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem?.id || !selectedCategoryImage) {
      alert("אנא בחר מוצר או קטגוריה, וגם קטגוריה");
      return;
    }

    const category = categories.find((c) => c.name === selectedCategoryImage);
    if (!category) {
      alert("שם קטגוריה שגוי");
      return;
    }

    try {
      const response = await fetch("/api/product-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: extractId(selectedItem.id),
          categoryId: category.id,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "שגיאה בקישור מוצר לקטגוריה");
      }

      alert("המוצר קושר בהצלחה!");
      setSelectedItem(null);
      setSelectedCategoryImage("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "אירעה שגיאה לא ידועה");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">קישור מוצר לקטגוריה</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product or Category Selector */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <ImageSelector<CombinedItem>
              items={combinedItems}
              value={selectedItem?.name || ""}
              onChange={(item) => setSelectedItem(item)}
              placeholder="הקלד שם מוצר או קטגוריה"
              label="מוצר או קטגוריה"
            />
          </div>
          {selectedItem?.image && (
            <Image
              src={selectedItem.image}
              alt="תצוגה"
              width={120}
              height={120}
              className="rounded border object-contain max-h-28"
            />
          )}
        </div>

        {/* Category Selector */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <ImageSelector
              items={categories.map((c) => ({
                id: c.id,
                name: c.name,
                image: c.image,
              }))}
              value={selectedCategoryImage}
              onChange={(item) => setSelectedCategoryImage(item?.name || "")}
              placeholder="הקלד שם קטגוריה"
              label="תמונה של קטגוריה"
            />
          </div>
          {categoryNameToImage(selectedCategoryImage) && (
            <Image
              src={categoryNameToImage(selectedCategoryImage)!}
              alt="תצוגת קטגוריה"
              width={120}
              height={120}
              className="rounded border object-contain max-h-28"
            />
          )}
        </div>

        <Button type="submit" className="w-full cursor-pointer mt-4">
          קשר מוצר לקטגוריה
        </Button>
      </form>
    </div>
  );
}
