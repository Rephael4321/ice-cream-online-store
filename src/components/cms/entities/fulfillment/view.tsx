"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

import ClientControlPanel from "@/components/cms/entities/fulfillment/ui/client-control-panel";
import OrderItemList from "@/components/cms/entities/fulfillment/ui/order-item-list";

/* ---------- types ---------- */
type Order = {
  orderId: number;
  clientPhone: string;
  clientName: string | null;
  clientAddress: string | null;
  createdAt: string;
  isPaid: boolean;
  isReady: boolean;
  isTest?: boolean;
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
type ExtendedItem = Item & { inStock: boolean };

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
    const r = await fetch(`/api/orders/${order.orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTest: flag }),
    });
    const data = await r.json();
    setOrder((o) => (o ? { ...o, ...data } : o));
    toast.success(flag ? "✅ ההזמנה סומנה כבדיקה" : "❌ סימון בדיקה הוסר");
  };

  const handleTitleClick = () => {
    setClicks((c) => c + 1);
    clickTimer.current && clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setClicks(0), 1000);
    if (clicks + 1 >= 5) {
      setClicks(0);
      markAsTest(true);
    }
  };

  useEffect(() => {
    if (!id) return;

    const fetchStock = async (): Promise<Record<number, boolean>> => {
      try {
        const res = await fetch(`/api/orders/${id}/stock`);
        if (!res.ok) return {};
        const { outOfStock } = (await res.json()) as { outOfStock: number[] };
        return Object.fromEntries(outOfStock.map((pid) => [pid, false]));
      } catch {
        return {};
      }
    };

    (async () => {
      try {
        const ordRes = await fetch(`/api/orders/${id}`);
        const { order: o, items: raw } = (await ordRes.json()) as {
          order: Order;
          items: Item[];
        };

        const stock = await fetchStock();
        setOrder(o);
        setItems(
          raw.map((it) => ({
            ...it,
            unitPrice: +it.unitPrice,
            salePrice: it.salePrice !== null ? +it.salePrice : null,
            inStock: stock[it.productId] !== false,
          }))
        );
      } finally {
        setLoad(false);
      }
    })();
  }, [id]);

  const flipOrderBool = async (field: "isPaid" | "isReady") => {
    if (!order) return;
    const r = await fetch(`/api/orders/${order.orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !order[field] }),
    });
    const data = await r.json();
    setOrder((o) => (o ? { ...o, ...data } : o));
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
      });
      return nextState;
    });
  };

  const calcTotals = () => {
    let actual = 0;
    for (const it of items) {
      let line = it.unitPrice * it.quantity;
      if (it.saleQuantity && it.salePrice && it.quantity >= it.saleQuantity) {
        const bundles = Math.floor(it.quantity / it.saleQuantity);
        const rest = it.quantity % it.saleQuantity;
        line = bundles * it.salePrice + rest * it.unitPrice;
      }
      if (it.inStock) actual += line;
    }
    return actual;
  };

  const handleReadyClick = async () => {
    if (!order) return;
    await flipOrderBool("isReady");
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק?")) return;
    const r = await fetch(`/api/orders/${order.orderId}`, { method: "DELETE" });
    r.ok
      ? (toast.success("🗑️ הזמנה נמחקה"), (window.location.href = "/orders"))
      : toast.error("❌ שגיאה במחיקה");
  };

  const handleUpdateClient = async () => {
    if (!order) return;
    const r = await fetch(`/api/orders/${order.orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim() || null,
        address: newAddr.trim() || null,
      }),
    });
    const data = await r.json();
    setOrder((o) => (o ? { ...o, ...data } : o));
    toast.success("📝 עודכן בהצלחה");
    setEditOpen(false);
  };

  if (loading) return <p className="p-6">טוען…</p>;
  if (!order) return <p className="p-6">הזמנה לא נמצאה.</p>;

  const finalTotal = calcTotals();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/orders" className="text-blue-600 hover:underline">
        ← חזרה לרשימת הזמנות
      </Link>

      <ClientControlPanel
        order={order}
        finalTotal={finalTotal}
        onDelete={handleDelete}
        onMarkTest={markAsTest}
        onEdit={() => {
          setNewName(order.clientName ?? "");
          setNewAddr(order.clientAddress ?? "");
          setEditOpen(true);
        }}
        onTogglePaid={() => flipOrderBool("isPaid")}
        onReadyClick={handleReadyClick}
        handleTitleClick={handleTitleClick}
      />

      <OrderItemList
        items={items}
        isTest={!!order.isTest}
        onToggleInStock={toggleStock}
      />

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
