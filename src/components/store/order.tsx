"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

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
  deliveryFee?: number | null; // ⬅️ snapshot from server if present
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

  // group snapshot (might be null for legacy or non-group items)
  group_id?: number | null;
  group_bundle_qty?: number | null;
  group_sale_price?: number | null;
  group_unit_price?: number | null;
  group_discount?: number | null;

  // server-computed
  total?: number;
};

export default function Order() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderHeader | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/orders/client/${id}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 307 || res.redirected) {
          window.location.href = res.url;
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.error) setError(data.error);
        else {
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

  // Build view-model from snapshot
  let totalBeforeDiscount = 0;
  let finalTotalFromItems = 0;

  const processed = items.map((raw) => {
    const qty = Number(raw.quantity || 0);
    const unitPrice = Number(raw.unit_price || 0);
    const saleQty = raw.sale_quantity ?? null;
    const salePrice = raw.sale_price != null ? Number(raw.sale_price) : null;

    const inGroup = raw.group_id != null;
    const perItemGroupDiscount = Number(raw.group_discount || 0);

    // Base (no discounts)
    const base = qty * unitPrice;
    totalBeforeDiscount += base;

    // Per-item sale applies ONLY if not in a sale group (matches cart rule)
    let afterItemSale = base;
    if (!inGroup && saleQty && salePrice != null && qty >= saleQty) {
      const bundles = Math.floor(qty / saleQty);
      const rest = qty % saleQty;
      afterItemSale = bundles * salePrice + rest * unitPrice;
    }

    // Apply recorded per-item group discount snapshot
    const payable = Math.max(0, afterItemSale - perItemGroupDiscount);
    finalTotalFromItems += payable;

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
    };
  });

  // Prefer server snapshot totals; fallback to derived totals
  const preGroupTotal =
    order.preGroupTotal != null
      ? Number(order.preGroupTotal)
      : finalTotalFromItems + 0;

  const groupDiscountTotal =
    order.groupDiscountTotal != null
      ? Number(order.groupDiscountTotal)
      : Math.max(
          0,
          processed.reduce((s, it) => s + (it.perItemGroupDiscount || 0), 0)
        );

  // Subtotal after discounts (no delivery)
  const subtotal = Math.max(0, preGroupTotal - groupDiscountTotal);

  // 🔧 Delivery config from env (fallbacks keep UI resilient)
  const DELIVERY_THRESHOLD = Number(
    process.env.NEXT_PUBLIC_DELIVERY_THRESHOLD || 90
  );
  const DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);

  // Delivery fee: use snapshot if present, else derive by the rule for legacy orders
  const derivedDelivery =
    subtotal > 0 && subtotal < DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const deliveryFee =
    order.deliveryFee != null ? Number(order.deliveryFee) : derivedDelivery;

  // Final total (prefer stored; otherwise subtotal + delivery)
  const finalTotal =
    order.total != null ? Number(order.total) : subtotal + deliveryFee;

  const totalSavings = Math.max(0, totalBeforeDiscount - finalTotal);

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
            className="border rounded p-4 shadow-sm flex items-center gap-4"
          >
            <div className="min-w-[64px]">
              {item.product_image ? (
                <Image
                  src={item.product_image}
                  alt={item.product_name}
                  width={64}
                  height={64}
                  className="rounded object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm">
                  אין תמונה
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1 text-right rtl">
              <p className="font-semibold">{item.product_name}</p>
              <p>כמות: {item.quantity}</p>
              <p>מחיר רגיל: ₪{item.unitPrice.toFixed(2)}</p>

              {/* Per-item sale (only if not a group item) */}
              {!item.inGroup &&
                item.saleQty &&
                item.salePrice != null &&
                item.quantity >= item.saleQty && (
                  <p>
                    מחיר מבצע: ₪{item.salePrice.toFixed(2)} ל-{item.saleQty}
                  </p>
                )}

              {/* Group discount snapshot (allocated part for this item) */}
              {item.inGroup && item.perItemGroupDiscount > 0 && (
                <p className="text-green-700">
                  הנחת קבוצה: −₪{item.perItemGroupDiscount.toFixed(2)}
                </p>
              )}

              <p>סה״כ למוצר: ₪{item.payable.toFixed(2)}</p>
              <p className="text-green-700">
                {item.saved > 0
                  ? `✔️ חסכת: ₪${item.saved.toFixed(2)}`
                  : "✔️ במחיר מלא"}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 text-right rtl space-y-1">
        {totalSavings > 0 && (
          <p className="text-green-700 font-medium">
            🎁 חסכת: ₪{totalSavings.toFixed(2)}
          </p>
        )}

        {/* Breakdown */}
        <p>ביניים: ₪{subtotal.toFixed(2)}</p>
        <p>
          דמי משלוח:{" "}
          {deliveryFee > 0
            ? `₪${deliveryFee.toFixed(2)}`
            : `₪0 (מעל ${DELIVERY_THRESHOLD}₪)`}
        </p>
        <p className="text-xl font-bold">
          💵 סה״כ לתשלום: ₪{finalTotal.toFixed(2)}
        </p>

        {/* Optional: show snapshot internals if present */}
        {order.preGroupTotal != null && (
          <p className="text-sm text-gray-500">
            (לפני הנחת קבוצה: ₪{Number(order.preGroupTotal).toFixed(2)} · הנחת
            קבוצה מצטברת: −₪
            {Number(order.groupDiscountTotal || 0).toFixed(2)})
          </p>
        )}
      </div>
    </div>
  );
}
