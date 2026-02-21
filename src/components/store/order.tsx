// app/order/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { apiGet } from "@/lib/api/client";

type OrderHeader = {
  orderId: number;
  clientName: string | null;
  clientAddress: string | null;
  clientPhone: string | null;
  createdAt: string;
  isPaid: boolean;
  isReady: boolean;
  preGroupTotal?: number | null;
  groupDiscountTotal?: number | null;
  deliveryFee?: number | null;
  total?: number | null;
};

type OrderItemRow = {
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  sale_quantity: number | null;
  sale_price: number | null;
  in_stock?: boolean;

  group_id?: number | null;
  group_bundle_qty?: number | null;
  group_sale_price?: number | null;
  group_unit_price?: number | null;
  group_discount?: number | null;

  total?: number;
};

export default function Order() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderHeader | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const url = `/api/orders/client/${id}`;

    apiGet(url, { signal: controller.signal })
      .then((res) => {
        if (res.status === 307 || res.redirected) {
          window.location.href = res.url;
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.error) {
          setError(data.error);
        } else {
          setOrder(data.order);
          setItems(data.items || []);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("שגיאה בעת טעינת ההזמנה");
        }
      });

    return () => controller.abort();
  }, [id]);

  if (error) {
    return (
      <div className="p-4 text-red-600 text-right rtl">⚠️ שגיאה: {error}</div>
    );
  }

  if (!order) {
    return <div className="p-4 text-right rtl">📦 טוען את פרטי ההזמנה...</div>;
  }

  // ---------- CALCULATION ----------
  let totalBeforeDiscount = 0;
  let sumAfterItemSale = 0;
  let sumGroupDiscount = 0;

  const processed = items.map((raw) => {
    const qty = Number(raw.quantity || 0);
    const unitPrice = Number(raw.unit_price || 0);
    const saleQty = raw.sale_quantity ?? null;
    const salePrice = raw.sale_price != null ? Number(raw.sale_price) : null;

    const inGroup = raw.group_id != null;
    const perItemGroupDiscount = Number(raw.group_discount || 0);

    const base = qty * unitPrice;

    let usedItemSale = false;
    let afterItemSale = base;
    if (
      !inGroup &&
      saleQty != null &&
      saleQty > 0 &&
      salePrice != null &&
      salePrice >= 0 &&
      qty >= saleQty
    ) {
      const bundles = Math.floor(qty / saleQty);
      const rest = qty % saleQty;
      afterItemSale = bundles * salePrice + rest * unitPrice;
      usedItemSale = true;
    }

    totalBeforeDiscount += base;
    sumAfterItemSale += afterItemSale;
    sumGroupDiscount += Math.max(0, perItemGroupDiscount);

    const payable = Math.max(0, afterItemSale - perItemGroupDiscount);
    const saved =
      Math.max(0, base - afterItemSale) + Math.max(0, perItemGroupDiscount);

    return {
      ...raw,
      unitPrice,
      saleQty,
      salePrice,
      base,
      afterItemSale,
      perItemGroupDiscount,
      payable,
      saved,
      inGroup,
      usedItemSale,
    };
  });

  const preGroupTotal =
    order.preGroupTotal != null
      ? Number(order.preGroupTotal)
      : sumAfterItemSale;

  const groupDiscountTotal =
    order.groupDiscountTotal != null
      ? Number(order.groupDiscountTotal)
      : Math.max(0, sumGroupDiscount);

  const subtotal = Math.max(0, preGroupTotal - groupDiscountTotal);

  const DELIVERY_THRESHOLD = Number(
    process.env.NEXT_PUBLIC_DELIVERY_THRESHOLD || 90
  );
  const DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);
  const derivedDelivery =
    subtotal > 0 && subtotal < DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;

  const deliveryFee =
    order.deliveryFee != null ? Number(order.deliveryFee) : derivedDelivery;

  const finalTotal =
    order.total != null ? Number(order.total) : subtotal + deliveryFee;

  const totalSavings = Math.max(0, totalBeforeDiscount - subtotal);

  return (
    <div className="max-w-2xl mx-auto p-6 text-right rtl">
      <h1 className="text-2xl font-bold mb-2">הזמנה מספר #{order.orderId}</h1>

      <div className="mb-4 space-y-1">
        <p>👤 לקוח: {order.clientName ?? "—"}</p>
        <p>🏠 כתובת: {order.clientAddress ?? "—"}</p>
        <p>📅 תאריך: {new Date(order.createdAt).toLocaleString("he-IL")}</p>
        <p>🏷️ סטטוס: {order.isReady ? "✅ מוכנה" : "🕒 בטיפול"}</p>
      </div>

      <h2 className="mt-6 font-semibold text-lg">📋 פרטי המוצרים:</h2>
      <ul className="space-y-6 mt-2">
        {processed.map((item, i) => (
          <li
            key={i}
            className={`border rounded p-4 shadow-sm flex items-center gap-4 ${
              item.in_stock === false ? "bg-red-50 border-red-300" : ""
            }`}
          >
            <div className="w-[60px] h-[60px] relative shrink-0">
              {item.product_image ? (
                <Image
                  src={item.product_image}
                  alt={item.product_name}
                  fill
                  className="object-contain rounded border"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 grid place-items-center rounded border bg-gray-100 text-gray-500 text-[10px]">
                  אין תמונה
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1 text-right rtl">
              <p className="font-semibold flex items-center gap-2 justify-end">
                {item.product_name}
                {item.in_stock === false && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white">
                    לא במלאי
                  </span>
                )}
              </p>
              <p>כמות: {item.quantity}</p>
              <p>מחיר רגיל: ₪{item.unitPrice.toFixed(2)}</p>

              {!item.inGroup &&
                item.saleQty &&
                item.salePrice != null &&
                item.quantity >= item.saleQty && (
                  <p>
                    מחיר מבצע: ₪{item.salePrice.toFixed(2)} ל-{item.saleQty}
                  </p>
                )}

              <p>
                סה״כ למוצר: ₪{item.payable.toFixed(2)}
                {item.in_stock === false && (
                  <span className="ml-2 text-xs text-red-700">לא יחויב</span>
                )}
              </p>

              <p className="text-green-700">
                {item.saved > 0
                  ? `₪${item.saved.toFixed(2)} חסכת`
                  : "במחיר מלא"}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 text-right rtl space-y-1">
        <p>ביניים: ₪{subtotal.toFixed(2)}</p>

        <p>
          דמי משלוח:{" "}
          {deliveryFee > 0
            ? `₪${deliveryFee.toFixed(2)}`
            : `₪0 (מעל ${DELIVERY_THRESHOLD}₪)`}
        </p>

        {totalSavings > 0 && (
          <p className="text-green-700 font-medium">
            🎁 סה״כ חסכת: ₪{totalSavings.toFixed(2)}
          </p>
        )}

        <p className="text-xl font-bold">
          💵 סה״כ לתשלום: ₪{finalTotal.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
