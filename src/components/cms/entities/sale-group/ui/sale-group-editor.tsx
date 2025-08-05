"use client";

import { useState } from "react";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/input";
import { showToast } from "@/components/cms/ui/toast";

interface SaleGroupEditorProps {
  id: number;
  initialName: string | null;
  initialQuantity: number | null;
  initialSalePrice: number | null;
}

export function SaleGroupEditor({
  id,
  initialName,
  initialQuantity,
  initialSalePrice,
}: SaleGroupEditorProps) {
  const [name, setName] = useState(initialName ?? "");
  const [quantity, setQuantity] = useState(initialQuantity ?? 0);
  const [salePrice, setSalePrice] = useState(initialSalePrice ?? 0);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sale-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          quantity: Number(quantity) || null,
          sale_price: Number(salePrice) || null,
        }),
      });

      if (!res.ok) throw new Error();

      showToast("קבוצת מבצע עודכנה בהצלחה", "success");
    } catch (err) {
      showToast("אירעה שגיאה בעדכון הקבוצה", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-xl border shadow-sm">
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
            value={quantity}
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
            value={salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value))}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? "שומר..." : "שמור שינויים"}
      </Button>
    </div>
  );
}
