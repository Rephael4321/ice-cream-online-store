"use client";

import Image from "next/image";
import Link from "next/link";

export type Item = {
  productId: number;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  saleQuantity: number | null;
  salePrice: number | null;
  inStock: boolean;
  storageName: string | null;
  storageSort: number | null;

  // group snapshot (per-item allocation from DB)
  groupId: number | null;
  groupBundleQty: number | null;
  groupSalePrice: number | null;
  groupUnitPrice: number | null;
  groupDiscount: number; // allocated split discount for this line
};

type Props = {
  items: Item[];
  isTest: boolean;
  isPaid: boolean;
  isReady: boolean;
  onToggleInStock: (productId: number) => void;
};

export default function OrderItemList({
  items,
  isTest,
  isPaid,
  isReady,
  onToggleInStock,
}: Props) {
  const testStyle = isTest
    ? "bg-yellow-200 border-2 border-yellow-700 text-yellow-950"
    : "";
  const completedStyle =
    !isTest && isPaid && isReady
      ? "bg-green-200 border-2 border-green-700 text-green-950"
      : "";

  // group by storage area for picking
  const byStorage = new Map<string, Item[]>();
  for (const item of items) {
    const key = item.storageName ?? "ללא מיקום";
    if (!byStorage.has(key)) byStorage.set(key, []);
    byStorage.get(key)!.push(item);
  }

  const storageGroups = [...byStorage.entries()].sort((a, b) => {
    const aSort = a[1][0].storageSort ?? 9999;
    const bSort = b[1][0].storageSort ?? 9999;
    return aSort - bSort;
  });

  return (
    <div className={`border rounded shadow p-4 ${testStyle || completedStyle}`}>
      <h2 className="text-lg font-bold mb-4">פרטי מוצרים</h2>

      {storageGroups.map(([groupName, groupItems]) => (
        <div key={groupName} className="mb-6">
          <h3 className="font-bold text-base border-b pb-1 mb-3 text-blue-800">
            {groupName}
          </h3>

          <ul className="space-y-4">
            {groupItems.map((it) => {
              const base = it.unitPrice * it.quantity;
              const inGroup = it.groupId != null;

              // per-item sale ONLY if NOT in a sale group
              let afterItemSale = base;
              if (
                !inGroup &&
                it.saleQuantity &&
                it.salePrice &&
                it.quantity >= it.saleQuantity
              ) {
                const bundles = Math.floor(it.quantity / it.saleQuantity);
                const rest = it.quantity % it.saleQuantity;
                afterItemSale = bundles * it.salePrice + rest * it.unitPrice;
              }

              const alloc = Math.max(0, Number(it.groupDiscount || 0)); // split discount from DB
              const payable = Math.max(0, afterItemSale - alloc);

              return (
                <li
                  key={it.productId}
                  className="border-b pb-2 flex gap-4 items-start"
                >
                  {it.productImage && (
                    <div className="w-[60px] h-[60px] relative shrink-0">
                      <Image
                        src={it.productImage}
                        alt={it.productName}
                        fill
                        className="object-contain rounded border"
                        unoptimized
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="font-semibold">{it.productName}</p>
                    <p>כמות: {it.quantity}</p>
                    <p>מחיר רגיל: ₪{it.unitPrice.toFixed(2)}</p>

                    {!inGroup &&
                      it.salePrice &&
                      it.saleQuantity &&
                      it.quantity >= it.saleQuantity && (
                        <p>
                          מחיר מבצע: ₪{it.salePrice.toFixed(2)} ל-
                          {it.saleQuantity}
                        </p>
                      )}

                    {/* show allocated split discount per item (not green) */}
                    {inGroup && alloc > 0 && (
                      <p>הנחת קבוצה: −₪{alloc.toFixed(2)}</p>
                    )}

                    <p className="font-bold">
                      סה״כ למוצר: ₪{payable.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 mt-1">
                    <button
                      onClick={() => onToggleInStock(it.productId)}
                      className={`text-sm px-3 py-1 rounded ${
                        it.inStock ? "bg-green-500 text-white" : "bg-gray-300"
                      }`}
                      title={it.inStock ? "סמן כחסר" : "החזר למלאי"}
                      aria-pressed={it.inStock}
                    >
                      {it.inStock ? "✔️ במלאי" : "❌ חסר"}
                    </button>

                    <Link
                      href={`/products/${it.productId}`}
                      className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-center"
                    >
                      ערוך מוצר
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
