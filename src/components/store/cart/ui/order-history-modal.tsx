"use client";

import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { apiGet } from "@/lib/api/client";

interface Order {
  orderId: number;
  createdAt: string;
  isPaid: boolean;
  isReady: boolean;
  isDelivered: boolean;
  isTest: boolean;
  isNotified: boolean;
  paymentMethod: string | null;
  itemCount: number;
  clientName: string | null;
  clientAddress: string | null;
  clientPhone: string;
  preGroupTotal: number | string | null;
  groupDiscountTotal: number | string | null;
  deliveryFee: number | string | null;
  total: number | string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderHistoryModal({ isOpen, onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  const copyWhatsAppMessage = async (orderId: number) => {
    const phoneNumber = (process.env.NEXT_PUBLIC_PHONE || "").replace(
      /\D/g,
      ""
    );
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const orderUrl = `${baseUrl}/order/${orderId}`;
    const msg = `מספר הזמנה ${orderId}.\n\nניתן לצפות בפירוט הזמנה בקישור הבא:\n${orderUrl}`;

    try {
      await navigator.clipboard.writeText(msg);
      toast.success("הודעת WhatsApp הועתקה ללוח");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("שגיאה בהעתקת ההודעה");
    }
  };

  const shareWhatsAppMessage = async (orderId: number) => {
    const phoneNumber = (process.env.NEXT_PUBLIC_PHONE || "").replace(
      /\D/g,
      ""
    );
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const orderUrl = `${baseUrl}/order/${orderId}`;
    const msg = `מספר הזמנה ${orderId}.\n\nניתן לצפות בפירוט הזמנה בקישור הבא:\n${orderUrl}`;

    const shareData = {
      title: `הזמנה ${orderId} - המפנק`,
      text: msg,
      url: orderUrl,
    };

    try {
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);
      } else {
        // Fallback to copy if share is not supported
        await navigator.clipboard.writeText(msg);
        toast.success("הודעת WhatsApp הועתקה ללוח (Share לא נתמך בדפדפן זה)");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        // User cancelled the share
        return;
      }
      console.error("Failed to share:", err);
      toast.error("שגיאה בשיתוף ההודעה");
    }
  };

  useEffect(() => {
    if (isOpen) {
      const cookiePhone = Cookies.get("phoneNumber");
      if (cookiePhone) {
        setPhoneNumber(cookiePhone);
        fetchOrders(cookiePhone);
      } else {
        setOrders([]);
      }
    }
  }, [isOpen]);

  const fetchOrders = async (phone: string) => {
    setLoading(true);
    try {
      const response = await apiGet(
        `/api/orders/by-phone?phone=${encodeURIComponent(phone)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("שגיאה בטעינת היסטוריית ההזמנות");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusText = (order: Order) => {
    if (order.isTest) return "הזמנת בדיקה";
    if (order.isDelivered) return "נמסר";
    if (order.isReady) return "מוכן למשלוח";
    if (order.isPaid) return "שולם";
    return "ממתין לתשלום";
  };

  const getStatusColor = (order: Order) => {
    if (order.isTest) return "text-gray-500";
    if (order.isDelivered) return "text-green-600";
    if (order.isReady) return "text-blue-600";
    if (order.isPaid) return "text-yellow-600";
    return "text-red-600";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 h-full w-full sm:w-80 bg-white shadow-lg flex flex-col p-4 z-[1000] transition-all">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">היסטורית הזמנות</h2>
        <button
          onClick={onClose}
          className="text-xl font-bold text-red-500 hover:text-red-700 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!phoneNumber ? (
          <div className="text-center text-gray-500 py-8">
            <p>לא נמצא מספר טלפון שמור</p>
            <p className="text-sm mt-2">יש לבצע הזמנה כדי לראות היסטוריה</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">טוען הזמנות...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>לא נמצאו הזמנות עבור מספר הטלפון</p>
            <p className="text-sm mt-2">{phoneNumber}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Client Info at Top */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm text-gray-600 mb-2">
                נמצאו {orders.length} הזמנות עבור {phoneNumber}
              </div>
              {orders.length > 0 && (
                <div className="text-sm">
                  {orders[0].clientName && (
                    <p>
                      <span className="font-medium">שם:</span>{" "}
                      {orders[0].clientName}
                    </p>
                  )}
                  {orders[0].clientAddress && (
                    <p>
                      <span className="font-medium">כתובת:</span>{" "}
                      {orders[0].clientAddress}
                    </p>
                  )}
                </div>
              )}
            </div>

            {orders.map((order) => (
              <div
                key={order.orderId}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors text-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">הזמנה #{order.orderId}</h3>
                    <p className="text-xs text-gray-600">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {Number(order.total || 0).toFixed(2)} ש״ח
                    </p>
                    <p
                      className={`text-xs font-medium ${getStatusColor(order)}`}
                    >
                      {getStatusText(order)}
                    </p>
                  </div>
                </div>

                {/* Copy WhatsApp Message Button */}
                <div className="flex justify-end mb-2 gap-2">
                  <button
                    onClick={() => copyWhatsAppMessage(order.orderId)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                    title="העתק הודעת WhatsApp"
                  >
                    📱 העתק הודעה
                  </button>
                  <button
                    onClick={() => shareWhatsAppMessage(order.orderId)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                    title="שתף עם אפליקציות"
                  >
                    📤 שתף
                  </button>
                </div>

                <div className="text-xs">
                  <p>
                    <span className="font-medium">פריטים:</span>{" "}
                    {order.itemCount}
                  </p>
                  <p>
                    <span className="font-medium">משלוח:</span>{" "}
                    {Number(order.deliveryFee || 0).toFixed(2)} ש״ח
                  </p>
                </div>

                {Number(order.groupDiscountTotal || 0) > 0 && (
                  <div className="mt-2 text-xs text-green-600">
                    <span className="font-medium">הנחה:</span>{" "}
                    {Number(order.groupDiscountTotal || 0).toFixed(2)} ש״ח
                  </div>
                )}

                {order.paymentMethod && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">אמצעי תשלום:</span>{" "}
                    {order.paymentMethod}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
