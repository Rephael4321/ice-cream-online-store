"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

import ClientControlPanel from "@/components/cms/entities/fulfillment/ui/client-control-panel";
import OrderItemList from "@/components/cms/entities/fulfillment/ui/order-item-list";

type Order = {
  orderId: number;
  clientPhone: string;
  clientName: string | null;
  clientAddress: string | null;
  createdAt: string;
  isPaid: boolean;
  isReady: boolean;
  isTest?: boolean;
  isNotified?: boolean;

  // NEW: delivery fee (nullable for legacy orders)
  deliveryFee?: number | null;
};

type Item = {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  saleQuantity: number | null;
  salePrice: number | null;
  storageName: string | null;
  storageSort: number | null;
};

type ExtendedItem = Item & { inStock: boolean };

// presence-check helper (key presence, not truthiness)
const has = (obj: any, key: string) =>
  obj != null && Object.prototype.hasOwnProperty.call(obj, key);

export default function ViewOrder() {
  const id = useParams()?.id as string | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<ExtendedItem[]>([]);
  const [loading, setLoad] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddr, setNewAddr] = useState("");

  const [clicks, setClicks] = useState(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  const markAsTest = async (flag: boolean) => {
    if (!order) return;
    try {
      const r = await fetch(`/api/orders/${order.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTest: flag }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      setOrder((o) => (o ? { ...o, ...data } : o));
      toast.success(flag ? "✅ ההזמנה סומנה כבדיקה" : "❌ סימון בדיקה הוסר");
    } catch {
      toast.error("❌ שגיאה בעדכון סטטוס בדיקה");
    }
  };

  const handleTitleClick = () => {
    setClicks((c) => c + 1);
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setClicks(0), 1000);
    if (clicks + 1 >= 5) {
      setClicks(0);
      markAsTest(true);
    }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const ordRes = await fetch(`/api/orders/${id}`);
        const { order: o, items: raw } = (await ordRes.json()) as {
          order: Order;
          items: Item[];
        };

        const enriched = (raw || []).map((it: any) => ({
          ...it,
          unitPrice: +it.unitPrice,
          salePrice: it.salePrice !== null ? +it.salePrice : null,
          inStock: it.inStock !== false,
          storageName: it.storageName ?? null,
          storageSort: it.storageSort ?? null,
        }));

        setOrder(o);
        setItems(enriched);
      } catch {
        toast.error("❌ שגיאה בטעינת הזמנה");
      } finally {
        setLoad(false);
      }
    })();
  }, [id]);

  const handleNotifyAndWhatsApp = async (): Promise<void> => {
    if (!order) return;

    const phone = order.clientPhone
      ?.replace(/[^0-9]/g, "")
      .replace(/^0/, "972");
    if (!phone) {
      toast.error("מספר טלפון לא תקין");
      return;
    }

    try {
      const r = await fetch(`/api/orders/${order.orderId}/notify`, {
        method: "PATCH",
      });
      if (!r.ok) throw new Error();

      setOrder((prev) => (prev ? { ...prev, isNotified: true } : prev));

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        "http://localhost:3000";
      const orderUrl = `${siteUrl}/order/${order.orderId}`;

      const msg = `שלום${
        order.clientName ? " " + order.clientName : ""
      }, ביצעת הזמנה מספר #${
        order.orderId
      } אצל המפנק. תוכל לצפות בפרטי ההזמנה כאן:\n${orderUrl}\n\nנעדכן אותך כשהיא מוכנה`;

      const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(
        msg
      )}`;
      window.location.href = whatsappLink;
    } catch {
      toast.error("❌ שגיאה בעדכון סטטוס וואטסאפ");
    }
  };

  const togglePaid = async () => {
    if (!order) return;
    try {
      const r = await fetch(`/api/orders/${order.orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !order.isPaid }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      setOrder((o) => (o ? { ...o, isPaid: data.isPaid ?? !o.isPaid } : o));
    } catch {
      toast.error("❌ שגיאה בעדכון תשלום");
    }
  };

  const toggleReady = async () => {
    if (!order) return;
    try {
      const r = await fetch(`/api/orders/${order.orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReady: !order.isReady }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");
      setOrder((o) => (o ? { ...o, isReady: data.isReady ?? !o.isReady } : o));
    } catch {
      toast.error("❌ שגיאה בעדכון סטטוס הזמנה");
    }
  };

  const toggleStock = async (productId: number) => {
    setItems((prev) => {
      const nextState = prev.map((it) =>
        it.productId === productId ? { ...it, inStock: !it.inStock } : it
      );
      const justToggled = nextState.find((it) => it.productId === productId)!;
      fetch(`/api/orders/${order?.orderId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, inStock: justToggled.inStock }),
      }).catch(() => {
        toast.error("❌ שגיאה בעדכון מלאי לפריט");
      });
      return nextState;
    });
  };

  // Subtotal from items (after item-level sale, only in-stock)
  const calcSubtotal = () => {
    let subtotal = 0;
    for (const it of items) {
      let line = it.unitPrice * it.quantity;
      if (it.saleQuantity && it.salePrice && it.quantity >= it.saleQuantity) {
        const bundles = Math.floor(it.quantity / it.saleQuantity);
        const rest = it.quantity % it.saleQuantity;
        line = bundles * it.salePrice + rest * it.unitPrice;
      }
      if (it.inStock) subtotal += line;
    }
    return subtotal;
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק?")) return;
    try {
      const r = await fetch(`/api/orders/${order.orderId}`, {
        method: "DELETE",
      });
      if (!r.ok) throw new Error();
      toast.success("🗑️ הזמנה נמחקה");
      window.location.href = "/orders";
    } catch {
      toast.error("❌ שגיאה במחיקה");
    }
  };

  // ✅ IMPORTANT: respects explicit null from API (so clearing "" shows immediately)
  const handleUpdateClient = async () => {
    if (!order) return;
    const payload = {
      name: newName.trim(), // "" → API converts to null and returns { name: null }
      address: newAddr.trim(),
    };
    try {
      const r = await fetch(`/api/orders/${order.orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");

      setOrder((o) =>
        o
          ? {
              ...o,
              clientName: has(data, "name") ? data.name : o.clientName,
              clientAddress: has(data, "address")
                ? data.address
                : o.clientAddress,
              clientPhone: has(data, "phone") ? data.phone : o.clientPhone,
              isPaid: has(data, "isPaid") ? data.isPaid : o.isPaid,
              isReady: has(data, "isReady") ? data.isReady : o.isReady,
            }
          : o
      );

      toast.success("📝 עודכן בהצלחה");
      setEditOpen(false);
    } catch {
      toast.error("❌ שגיאה בעדכון פרטי לקוח");
    }
  };

  if (loading) return <p className="p-6">טוען…</p>;
  if (!order) return <p className="p-6">הזמנה לא נמצאה.</p>;

  // --- Delivery fee breakdown ---
  const DELIVERY_THRESHOLD = 90;
  const DELIVERY_FEE = 10;

  const subtotal = calcSubtotal();
  const deliveryFee =
    order.deliveryFee != null
      ? Number(order.deliveryFee)
      : subtotal > 0 && subtotal < DELIVERY_THRESHOLD
      ? DELIVERY_FEE
      : 0;

  const grandTotal = subtotal + deliveryFee;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/orders" className="text-blue-600 hover:underline">
        ← חזרה לרשימת הזמנות
      </Link>

      <ClientControlPanel
        order={order}
        finalTotal={grandTotal} // includes delivery fee
        onDelete={handleDelete}
        onMarkTest={markAsTest}
        onEdit={() => {
          setNewName(order.clientName ?? "");
          setNewAddr(order.clientAddress ?? "");
          setEditOpen(true);
        }}
        onTogglePaid={togglePaid}
        onReadyClick={toggleReady}
        handleTitleClick={handleTitleClick}
        onNotifyWhatsApp={handleNotifyAndWhatsApp}
      />

      <OrderItemList
        items={items}
        isTest={!!order.isTest}
        isPaid={order.isPaid}
        isReady={order.isReady}
        onToggleInStock={toggleStock}
      />

      {/* NEW: Totals box incl. delivery fee */}
      <div className="text-right rtl border rounded p-4 bg-gray-50">
        <p>ביניים: ₪{subtotal.toFixed(2)}</p>
        <p>
          דמי משלוח:{" "}
          {deliveryFee > 0 ? `₪${deliveryFee.toFixed(2)}` : "₪0 (מעל 90₪)"}
        </p>
        <p className="text-xl font-bold">
          סה״כ לתשלום: ₪{grandTotal.toFixed(2)}
        </p>
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded shadow-lg w-full max-w-md"
          >
            <h2 className="text-lg font-bold mb-4">עריכת פרטי לקוח</h2>

            <label className="block mb-2">
              שם:
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full border p-2 rounded"
              />
            </label>

            <label className="block mb-4">
              כתובת:
              <input
                value={newAddr}
                onChange={(e) => setNewAddr(e.target.value)}
                className="mt-1 w-full border p-2 rounded"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400"
              >
                ביטול
              </button>
              <button
                onClick={handleUpdateClient}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
