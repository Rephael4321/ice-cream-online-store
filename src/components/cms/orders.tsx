"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type Order = {
  orderId: number;
  phone: string;
  createdAt: string;
  itemCount: number;
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get Sunday–Saturday for current week
  const getCurrentWeekRange = () => {
    const now = new Date();

    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);

    const format = (d: Date) => d.toISOString().split("T")[0];

    return {
      from: format(sunday),
      to: format(saturday),
    };
  };

  const fetchOrders = async (from?: string, to?: string) => {
    setLoading(true);

    let query = "";
    if (from && to) {
      query = `?from=${from}&to=${to}`;
    }

    const res = await fetch(`/api/orders${query}`);
    const data = await res.json();

    setOrders(data.orders || []);
    setLoading(false);
  };

  // Fetch current week on mount
  useEffect(() => {
    const { from, to } = getCurrentWeekRange();
    fetchOrders(from, to);
  }, []);

  // Fetch specific day when date selected
  useEffect(() => {
    if (selectedDate === null) {
      const { from, to } = getCurrentWeekRange();
      fetchOrders(from, to);
    } else {
      const dateStr = selectedDate.toLocaleDateString("sv-SE");
      fetchOrders(dateStr, dateStr);
    }
  }, [selectedDate]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📦 הזמנות</h1>

      {/* Calendar Filter */}
      <div className="mb-6 flex items-center gap-4">
        <label className="font-semibold">סנן לפי תאריך:</label>
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          placeholderText="בחר תאריך"
          dateFormat="dd/MM/yyyy"
          className="border px-3 py-2 rounded"
          isClearable
        />
      </div>

      {loading ? (
        <p>טוען הזמנות...</p>
      ) : orders.length === 0 ? (
        <p>אין הזמנות לתאריך זה.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const date = new Date(order.createdAt);
            const formatted = !isNaN(date.getTime())
              ? date.toLocaleString("he-IL")
              : order.createdAt;

            return (
              <li
                key={order.orderId}
                className="border rounded p-4 shadow flex justify-between items-center"
              >
                <div>
                  <p className="font-bold">הזמנה #{order.orderId}</p>
                  <p>טלפון: {order.phone}</p>
                  <p>תאריך: {formatted}</p>
                  <p>כמות מוצרים: {order.itemCount}</p>
                </div>
                <Link
                  href={`/orders/${order.orderId}`}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  צפייה
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
