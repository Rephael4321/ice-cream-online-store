"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/cms/ui/input";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";

export default function NewSaleGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [salePrice, setSalePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sale-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          quantity: quantity ?? null,
          sale_price: salePrice ?? null,
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      showToast("קבוצת מבצע נוצרה בהצלחה", "success");

      // Redirect to group view
      router.push(`/sale-groups/${data.id}`);
    } catch (err) {
      showToast("שגיאה ביצירת הקבוצה", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 bg-white p-6 rounded-xl shadow">
      <h2 className="text-xl font-bold text-purple-700">
        יצירת קבוצת מבצע חדשה
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          שם הקבוצה
        </label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            כמות למבצע
          </label>
          <Input
            type="number"
            min={1}
            value={quantity ?? ""}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מחיר מבצע
          </label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={salePrice ?? ""}
            onChange={(e) => setSalePrice(Number(e.target.value))}
          />
        </div>
      </div>

      <Button onClick={handleCreate} disabled={loading}>
        {loading ? "שולח..." : "צור קבוצה"}
      </Button>
    </div>
  );
}
