"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Order = {
  orderId: number;
  phone: string;
  createdAt: string;
  itemCount: number;
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📦 הזמנות</h1>

      {loading ? (
        <p>טוען הזמנות...</p>
      ) : orders.length === 0 ? (
        <p>אין הזמנות עדיין.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.orderId}
              className="border rounded p-4 shadow flex justify-between items-center"
            >
              <div>
                <p className="font-bold">הזמנה #{order.orderId}</p>
                <p>טלפון: {order.phone}</p>
                <p>
                  תאריך: {new Date(order.createdAt).toLocaleString("he-IL")}
                </p>
                <p>כמות מוצרים: {order.itemCount}</p>
              </div>
              <Link
                href={`/cms/orders/${order.orderId}`}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                צפייה
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
