"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SaleGroupItem } from "./ui/sale-group-item";
import { showToast } from "@/components/cms/ui/toast";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string | null;
  in_stock?: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function SaleGroupItemManager() {
  const { id } = useParams();
  const groupId = Number(id);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/sale-groups/${groupId}/items`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data);
    } catch {
      showToast("שגיאה בטעינת המוצרים", "error");
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const res = await fetch(
        `/api/sale-groups/${groupId}/items/${productId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();

      showToast("המוצר הוסר מהקבוצה", "success");
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch {
      showToast("שגיאה בהסרת המוצר", "error");
    }
  };

  useEffect(() => {
    if (!groupId) return;
    fetchProducts();
  }, [groupId]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4 text-center">
        ניהול מוצרים בקבוצת מבצע
      </h1>

      {loading ? (
        <p className="text-center mt-6">טוען מוצרים...</p>
      ) : (
        <div className="space-y-3 mt-6 max-w-2xl mx-auto">
          {products.length === 0 ? (
            <p className="text-center text-gray-600">
              אין מוצרים בקבוצה זו עדיין.
            </p>
          ) : (
            products.map((product) => (
              <SaleGroupItem
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image={product.image}
                onRemove={removeProduct}
              />
            ))
          )}
        </div>
      )}
    </main>
  );
}
