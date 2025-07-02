"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image"; // ✅ Required for images

type Order = {
  orderId: number;
  phone: string;
  createdAt: string;
};

type Item = {
  productId: number;
  productName: string;
  productImage: string; // ✅ new
  quantity: number;
  unitPrice: number;
  saleQuantity: number | null;
  salePrice: number | null;
};

export default function OrderDetails() {
  const params = useParams();
  const id = params?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/orders/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setOrder(data.order);

        const parsedItems = (data.items || []).map((item: any) => ({
          ...item,
          unitPrice: parseFloat(item.unitPrice),
          salePrice:
            item.salePrice !== null ? parseFloat(item.salePrice) : null,
        }));

        setItems(parsedItems);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="p-6">טוען...</p>;
  if (!order) return <p className="p-6">הזמנה לא נמצאה.</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/orders" className="text-blue-600 hover:underline">
        ← חזרה לרשימת הזמנות
      </Link>

      <div className="border p-4 rounded shadow">
        <h1 className="text-xl font-bold mb-2">הזמנה #{order.orderId}</h1>
        <p>טלפון: {order.phone}</p>
        <p>תאריך: {new Date(order.createdAt).toLocaleString("he-IL")}</p>
      </div>

      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-4">פרטי מוצרים</h2>
        <ul className="space-y-4">
          {items.map((item, i) => {
            const baseTotal = item.unitPrice * item.quantity;

            let finalTotal = baseTotal;
            let discount = 0;

            const hasSale =
              item.saleQuantity !== null &&
              item.salePrice !== null &&
              item.quantity >= item.saleQuantity;

            if (hasSale) {
              const bundles = Math.floor(item.quantity / item.saleQuantity!);
              const remainder = item.quantity % item.saleQuantity!;
              finalTotal =
                bundles * item.salePrice! + remainder * item.unitPrice;
              discount = baseTotal - finalTotal;
            }

            return (
              <li key={i} className="border-b pb-2 flex gap-4 items-start">
                {item.productImage && (
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    width={60}
                    height={60}
                    className="rounded border"
                  />
                )}

                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p>כמות: {item.quantity}</p>
                  <p>מחיר רגיל: {item.unitPrice.toFixed(2)} ש״ח</p>
                  {hasSale && (
                    <>
                      <p>
                        מחיר מבצע: {item.salePrice!.toFixed(2)} ש״ח ל-
                        {item.saleQuantity}
                      </p>
                      <p className="text-green-600">
                        חסכון: {discount.toFixed(2)} ש״ח
                      </p>
                    </>
                  )}
                  <p className="font-bold">
                    סה״כ למוצר: {finalTotal.toFixed(2)} ש״ח
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
