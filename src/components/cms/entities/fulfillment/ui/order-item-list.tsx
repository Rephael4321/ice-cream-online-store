"use client";

import Image from "next/image";

/* ─── Types passed from <OrderDetails /> ─── */
export type Item = {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  saleQuantity: number | null;
  salePrice: number | null;
  inStock: boolean;
};

type Props = {
  items: Item[];
  isTest: boolean;
  onToggleInStock: (productId: number) => void;
};

export default function OrderItemList({
  items,
  isTest,
  onToggleInStock,
}: Props) {
  /* ─── running totals ─── */
  let before = 0,
    after = 0,
    actual = 0;

  /* ─── each line ─── */
  const rows = items.map((it) => {
    const base = it.unitPrice * it.quantity;
    before += base;

    let withDisc = base;
    if (it.saleQuantity && it.salePrice && it.quantity >= it.saleQuantity) {
      const bundles = Math.floor(it.quantity / it.saleQuantity);
      const rest = it.quantity % it.saleQuantity;
      withDisc = bundles * it.salePrice + rest * it.unitPrice;
    }
    after += withDisc;
    if (it.inStock) actual += withDisc;

    return (
      <li key={it.productId} className="border-b pb-2 flex gap-4 items-start">
        {it.productImage && (
          <Image
            src={it.productImage}
            alt={it.productName}
            width={60}
            height={60}
            className="rounded border"
          />
        )}

        <div className="flex-1">
          <p className="font-semibold">{it.productName}</p>
          <p>כמות: {it.quantity}</p>
          <p>מחיר רגיל: ₪{it.unitPrice.toFixed(2)}</p>
          {it.salePrice &&
            it.saleQuantity &&
            it.quantity >= it.saleQuantity && (
              <p>
                מחיר מבצע: ₪{it.salePrice.toFixed(2)} ל‑{it.saleQuantity}
              </p>
            )}
          <p className="font-bold">סה״כ למוצר: ₪{withDisc.toFixed(2)}</p>
        </div>

        <button
          onClick={() => onToggleInStock(it.productId)}
          className={`text-sm px-3 py-1 rounded h-fit mt-1 ${
            it.inStock ? "bg-green-500 text-white" : "bg-gray-300"
          }`}
        >
          {it.inStock ? "✔️ במלאי" : "❌ חסר"}
        </button>
      </li>
    );
  });

  const discount = before - after;

  /* ─── box ─── */
  return (
    <div
      className={`border p-4 rounded shadow ${
        isTest ? "bg-yellow-100 border-yellow-400" : ""
      }`}
    >
      <h2 className="text-lg font-bold mb-4">פרטי מוצרים</h2>

      <ul className="space-y-4">{rows}</ul>

      <div className="text-right mt-6 space-y-2 border-t pt-4">
        <p>סה״כ לפני הנחה: ₪{before.toFixed(2)}</p>
        <p>סה״כ הנחה: ₪{discount.toFixed(2)}</p>
        <p>סה״כ הזמנה: ₪{after.toFixed(2)}</p>
        <p className="text-xl font-bold text-pink-700">
          סה״כ לתשלום בפועל: ₪{actual.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
