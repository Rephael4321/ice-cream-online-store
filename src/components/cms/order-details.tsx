"use client";

// TODO: MAKE SURE PRODUCT ON SALE CATEGORY, SALE TAKES

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Order = {
  orderId: number;
  phone: string;
  createdAt: string;
};

type Item = {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  saleQuantity: number | null;
  salePrice: number | null;
};

export default function OrderDetails() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/orders/${id}`)
      .then((res) => res.json())
      .then((data: { order: Order; items: Item[] }) => {
        setOrder(data.order);

        const parsedItems = data.items.map((item) => ({
          ...item,
          unitPrice: parseFloat(item.unitPrice as unknown as string),
          salePrice:
            item.salePrice !== null
              ? parseFloat(item.salePrice as unknown as string)
              : null,
        }));

        setItems(parsedItems);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6">טוען...</p>;
  if (!order) return <p className="p-6">הזמנה לא נמצאה.</p>;

  let totalWithoutDiscount = 0;
  let totalWithDiscount = 0;

  const renderedItems = items.map((item, i) => {
    const baseTotal = item.unitPrice * item.quantity;
    totalWithoutDiscount += baseTotal;

    let finalTotal = baseTotal;
    let discount = 0;

    if (
      item.saleQuantity !== null &&
      item.salePrice !== null &&
      item.quantity >= item.saleQuantity
    ) {
      const saleQuantity = item.saleQuantity;
      const salePrice = item.salePrice;

      const bundles = Math.floor(item.quantity / saleQuantity);
      const remainder = item.quantity % saleQuantity;
      finalTotal = bundles * salePrice + remainder * item.unitPrice;
      discount = baseTotal - finalTotal;
    }

    totalWithDiscount += finalTotal;

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

          {item.salePrice !== null &&
            item.saleQuantity !== null &&
            item.quantity >= item.saleQuantity && (
              <>
                <p>
                  מחיר מבצע: {item.salePrice.toFixed(2)} ש״ח ל-
                  {item.saleQuantity}
                </p>
                <p className="text-green-600">
                  הנחה: {discount.toFixed(2)} ש״ח
                </p>
              </>
            )}

          <p className="font-bold">סה״כ למוצר: {finalTotal.toFixed(2)} ש״ח</p>
        </div>
      </li>
    );
  });

  const totalDiscount = totalWithoutDiscount - totalWithDiscount;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/orders" className="text-blue-600 hover:underline">
        ← חזרה לרשימת הזמנות
      </Link>

      <div className="border p-4 rounded shadow">
        <h1 className="text-xl font-bold mb-2">הזמנה #{order.orderId}</h1>
        <p>טלפון: {order.phone}</p>
        <p>
          תאריך:{" "}
          {isNaN(new Date(order.createdAt).getTime())
            ? order.createdAt
            : new Date(order.createdAt).toLocaleString("he-IL")}
        </p>
      </div>

      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-4">פרטי מוצרים</h2>
        <ul className="space-y-4">{renderedItems}</ul>

        <div className="text-right mt-6 space-y-2 border-t pt-4">
          <p className="text-base text-gray-500 font-medium">
            סה״כ לפני הנחה: {totalWithoutDiscount.toFixed(2)} ש״ח
          </p>
          <p className="text-base text-green-600 font-medium">
            סה״כ הנחה: {totalDiscount.toFixed(2)} ש״ח
          </p>
          <p className="text-xl font-bold text-pink-700">
            סה״כ לתשלום: {totalWithDiscount.toFixed(2)} ש״ח
          </p>
        </div>
      </div>
    </div>
  );
}
