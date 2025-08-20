// components/cms/entities/sale-group/ui/product-row.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/cms/ui/button";
import { showToast } from "@/components/cms/ui/toast";
import Image from "next/image";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  sale: { quantity: number; sale_price: number } | null;
  alreadyLinked: boolean;
};

type SaleGroupInfo = {
  quantity: number | string | null;
  sale_price: number | string | null;
  price: number | string | null;
};

type GroupStats = {
  min: number;
  max: number;
  uniqueCount: number;
};

type Props = {
  saleGroupId: number;
  product: Product;
  onChange: () => void;
  groupSaleInfo: SaleGroupInfo;
  groupStats?: GroupStats;
};

export default function ProductRow({
  product,
  saleGroupId,
  onChange,
  groupSaleInfo,
  groupStats,
}: Props) {
  const [loading, setLoading] = useState(false);

  const priceNumber =
    groupSaleInfo.price !== null ? Number(groupSaleInfo.price) : null;
  const salePriceNumber =
    groupSaleInfo.sale_price !== null ? Number(groupSaleInfo.sale_price) : null;
  const quantityNumber =
    groupSaleInfo.quantity !== null ? Number(groupSaleInfo.quantity) : null;

  const groupHasBase =
    priceNumber !== null && salePriceNumber !== null && quantityNumber !== null;

  const unitPriceMismatch =
    groupHasBase &&
    Number(product.price.toFixed(2)) !== Number(priceNumber.toFixed(2));

  const saleMismatch =
    groupHasBase &&
    (!product.sale ||
      product.sale.quantity !== quantityNumber ||
      Number(product.sale.sale_price.toFixed(2)) !==
        Number(salePriceNumber.toFixed(2)));

  const productMismatch =
    !product.alreadyLinked && (unitPriceMismatch || saleMismatch);

  const priceIsMax =
    groupStats &&
    Number(product.price.toFixed(2)) === Number(groupStats.max.toFixed(2));
  const priceIsMin =
    groupStats &&
    Number(product.price.toFixed(2)) === Number(groupStats.min.toFixed(2));
  const showPriceChip = !!groupStats && groupStats.uniqueCount > 1;

  async function addProduct() {
    if (productMismatch) {
      showToast("❌ מחיר המוצר או פרטי המבצע לא תואמים לקבוצה", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/sale-groups/${saleGroupId}/items/${product.id}`,
        { method: "POST" }
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
        { method: "DELETE" }
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
      <div className="relative w-[60px] h-[60px] shrink-0 rounded-md overflow-hidden shadow-inner bg-gray-100 border border-gray-200">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-contain p-1"
          sizes="60px"
        />
      </div>

      <div className="flex flex-col sm:flex-row flex-1 w-full sm:items-center gap-2 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">
            #{product.id} - {product.name}
          </div>

          <div className="text-sm text-muted truncate flex flex-wrap items-center gap-2">
            <span>₪{Number(product.price).toFixed(2)}</span>

            {showPriceChip && priceIsMax && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                title="יקר בקבוצה"
              >
                ⬆️ יקר בקבוצה
              </span>
            )}
            {showPriceChip && !priceIsMax && priceIsMin && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                title="זול בקבוצה"
              >
                ⬇️ זול בקבוצה
              </span>
            )}

            {product.sale && (
              <span className="text-green-600 ms-2">
                מבצע: ₪{Number(product.sale.sale_price).toFixed(2)} ×{" "}
                {product.sale.quantity}
              </span>
            )}

            {product.alreadyLinked === false &&
              groupHasBase &&
              (unitPriceMismatch || saleMismatch) && (
                <span className="text-red-600 ms-2 font-semibold">
                  ⚠️ מחיר או מבצע לא תואמים לקבוצה
                </span>
              )}
          </div>
        </div>

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
              disabled={loading || productMismatch}
              title={
                productMismatch
                  ? "המוצר לא תואם למחיר או מבצע הקבוצה"
                  : "הוסף מוצר לקבוצה"
              }
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
