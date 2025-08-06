"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { showToast } from "@/components/cms/ui/toast";
import { SaleGroupEditor } from "./ui/sale-group-editor";

type SaleGroup = {
  id: number;
  name: string | null;
  quantity: number | null;
  sale_price: number | null;
  image: string | null;
  created_at: string;
  updated_at: string;
  categories: { id: number; name: string }[]; // 👈 include categories
};

export default function ViewSaleGroup() {
  const { id } = useParams();
  const [group, setGroup] = useState<SaleGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/sale-groups/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setGroup(data);
      } catch {
        showToast("שגיאה בטעינת פרטי הקבוצה", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [id]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 text-center mb-6">
        עריכת קבוצת מבצע
      </h1>

      {loading ? (
        <p className="text-center mt-8">טוען פרטי קבוצה...</p>
      ) : !group ? (
        <p className="text-center mt-8 text-red-600">קבוצה לא נמצאה</p>
      ) : (
        <div className="max-w-5xl mx-auto mt-6">
          <SaleGroupEditor
            id={group.id}
            initialName={group.name}
            initialQuantity={group.quantity}
            initialSalePrice={group.sale_price}
            initialImage={group.image}
            initialPrice={
              group.sale_price != null && group.quantity != null
                ? group.sale_price * group.quantity
                : null
            }
            initialCategories={group.categories || []} // ✅ important
          />
        </div>
      )}
    </main>
  );
}
