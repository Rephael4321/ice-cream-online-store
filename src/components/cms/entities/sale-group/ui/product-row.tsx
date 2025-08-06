"use client";

import { useState } from "react";
import { Button } from "@/components/cms/ui/button";
import { Input } from "@/components/cms/ui/input";
import { showToast } from "@/components/cms/ui/toast";
import Image from "next/image";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  sale: { quantity: number; sale_price: number } | null;
  label?: string;
  color?: string;
  alreadyLinked: boolean;
};

type SaleGroupInfo = {
  quantity: number | null;
  sale_price: number | null;
};

type Props = {
  saleGroupId: number;
  product: Product;
  onChange: () => void;
  groupSaleInfo: SaleGroupInfo;
};

export default function ProductRow({
  product,
  saleGroupId,
  onChange,
  groupSaleInfo,
}: Props) {
  const [label, setLabel] = useState(product.label || "");
  const [color, setColor] = useState(product.color || "#000000");
  const [loading, setLoading] = useState(false);

  async function addProduct() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sale-groups/${saleGroupId}/items/${product.id}`,
        {
          method: "POST",
          body: JSON.stringify({ label, color }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "❌ שגיאה בהוספת המוצר", "error");
      } else {
        showToast("✔️ המוצר נוסף בהצלחה");
        await onChange();
      }
    } catch {
      showToast("❌ שגיאה בהוספת המוצר", "error");
    }
    setLoading(false);
  }

  async function removeProduct() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sale-groups/${saleGroupId}/items/${product.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "❌ שגיאה בהסרת המוצר", "error");
      } else {
        showToast("🗑️ המוצר הוסר מהקבוצה");
        await onChange();
      }
    } catch {
      showToast("❌ שגיאה בהסרת המוצר", "error");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 border rounded-md p-3 w-full shadow-sm bg-white">
      {/* Image */}
      <div className="relative w-[60px] h-[60px] shrink-0 rounded-md overflow-hidden shadow-inner bg-gray-100 border border-gray-200">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-1"
          sizes="60px"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col sm:flex-row flex-1 w-full sm:items-center gap-2 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">
            #{product.id} - {product.name}
          </div>
          <div className="text-sm text-muted truncate">
            ₪{product.price}
            {product.sale && (
              <span className="text-green-600 ms-2">
                מבצע: ₪{product.sale.sale_price} × {product.sale.quantity}
              </span>
            )}
          </div>
        </div>

        {/* Inputs */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="תווית"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full sm:w-[120px]"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded border"
          />
        </div>

        {/* Buttons */}
        <div className="w-full sm:w-auto">
          {product.alreadyLinked ? (
            <Button
              variant="destructive"
              onClick={removeProduct}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              הסר
            </Button>
          ) : (
            <Button
              onClick={addProduct}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              הוסף
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
