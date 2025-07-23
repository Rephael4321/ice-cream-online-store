"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

export default function Order() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/client/${id}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setOrder(data.order);
          setItems(data.items);
        }
      })
      .catch(() => {
        setError("שגיאה בעת טעינת ההזמנה");
      });
  }, [id]);

  if (error)
    return (
      <div className="p-4 text-red-600 text-right rtl">⚠️ שגיאה: {error}</div>
    );

  if (!order)
    return <div className="p-4 text-right rtl">📦 טוען את פרטי ההזמנה...</div>;

  let totalBeforeDiscount = 0;
  let finalTotal = 0;

  const processedItems = items.map((item) => {
    const qty = item.quantity;
    const unitPrice = Number(item.unit_price);
    const saleQty = item.sale_quantity;
    const salePrice = item.sale_price !== null ? Number(item.sale_price) : null;

    totalBeforeDiscount += qty * unitPrice;

    let productTotal = 0;
    if (saleQty && salePrice !== null && qty >= saleQty) {
      const bundles = Math.floor(qty / saleQty);
      const rest = qty % saleQty;
      productTotal = bundles * salePrice + rest * unitPrice;
    } else {
      productTotal = qty * unitPrice;
    }

    finalTotal += productTotal;

    return {
      ...item,
      unitPrice,
      saleQty,
      salePrice,
      productTotal,
    };
  });

  const totalSavings = totalBeforeDiscount - finalTotal;

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
        {processedItems.map((item, i) => (
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
                  className="rounded"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm">
                  אין תמונה
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1 text-right rtl">
              <p className="font-semibold">{item.product_name}</p>
              <p>{item.product_name}</p>
              <p>כמות: {item.quantity}</p>
              <p>מחיר רגיל: ₪{item.unitPrice.toFixed(2)}</p>
              {item.saleQty &&
                item.salePrice !== null &&
                item.quantity >= item.saleQty && (
                  <p>
                    מחיר מבצע: ₪{item.salePrice.toFixed(2)} ל‑{item.saleQty}
                  </p>
                )}
              <p>סה״כ למוצר: ₪{item.productTotal.toFixed(2)}</p>
              <p className="text-green-700">✔️ במלאי</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 text-xl font-bold space-y-1 text-right rtl">
        {totalSavings > 0 && (
          <p className="text-green-700">🎁 חסכת: ₪{totalSavings.toFixed(2)}</p>
        )}
        <p>💵 סה״כ לתשלום: ₪{finalTotal.toFixed(2)}</p>
      </div>
    </div>
  );
}
