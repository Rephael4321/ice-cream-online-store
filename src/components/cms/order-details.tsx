/* ──────────────────────────────────────────────────────────
   src/components/cms/order-details.tsx
   (page.tsx inside app/(cms)/orders/[id] can simply re‑export this)
   ────────────────────────────────────────────────────────── */
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
  phone: string;
  name: string | null;
  address: string | null;
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
  unitPrice: number; // will be coerced to number
  saleQuantity: number | null;
  salePrice: number | null; // will be coerced to number
};
type ExtendedItem = Item & { inStock: boolean };

/* ---------- component ---------- */
export default function OrderDetails() {
  const id = useParams()?.id as string | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<ExtendedItem[]>([]);
  const [loading, setLoad] = useState(true);

  /* ✏️ modal */
  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddr, setNewAddr] = useState("");

  /* hidden mark‑as‑test */
  const [clicks, setClicks] = useState(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  /* ────────── helpers ────────── */
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
    clickTimer.current = setTimeout(() => setClicks(0), 1_000);
    if (clicks + 1 >= 5) {
      setClicks(0);
      markAsTest(true);
    }
  };

  /* ────────── initial fetch ────────── */
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

  /* ────────── API PATCH helpers ────────── */
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

  /* toggle in‑stock & persist */
  const toggleStock = async (productId: number) => {
    setItems((prev) => {
      const nextState = prev.map((it) =>
        it.productId === productId ? { ...it, inStock: !it.inStock } : it
      );
      /* compute the value we just set so we can persist */
      const justToggled = nextState.find((it) => it.productId === productId)!;
      /* fire‑and‑forget API */
      fetch(`/api/orders/${order?.orderId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, inStock: justToggled.inStock }),
      });
      return nextState;
    });
  };

  /* totals (for WA message) */
  const calcTotals = () => {
    let before = 0,
      after = 0,
      actual = 0;
    for (const it of items) {
      const base = it.unitPrice * it.quantity;
      before += base;

      let withDisc = base;
      if (it.saleQuantity && it.salePrice && it.quantity >= it.saleQuantity) {
        const bundles = Math.floor(it.quantity / it.saleQuantity);
        const rest = it.quantity % it.saleQuantity;
        withDisc = bundles * it.salePrice + rest * it.unitPrice;
      }
      after += withDisc;
      if (it.inStock) actual += withDisc;
    }
    return { before, discount: before - after, orderSum: after, actual };
  };

  /* “הזמנה מוכנה” behaviour */
  const handleReadyClick = async () => {
    if (!order) return;

    const missing = items.filter((it) => !it.inStock);
    await flipOrderBool("isReady");

    if (missing.length === 0) return; // nothing to tell

    const { before, discount, orderSum, actual } = calcTotals();
    const msg = [
      `שלום ${order.name ?? ""},`,
      "ההזמנה מוכנה אך חלק מהמוצרים אינם במלאי:",
      ...missing.map((m) => `• ${m.productName} (כמות: ${m.quantity})`),
      "",
      `סה״כ לתשלום: ₪${actual.toFixed(2)}`,
    ].join("\n");

    const phone = order.phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(
      msg
    )}`;
    window.location.href = whatsappURL;
  };

  /* delete & client‑edit */
  const handleDelete = async () => {
    if (!order) return;
    if (!confirm("האם אתה בטוח שברצונך למחוק?")) return;
    const r = await fetch(`/api/orders/${order.orderId}`, { method: "DELETE" });
    r.ok
      ? (toast.success("🗑️ הזמנה נמחקה"), (window.location.href = "/orders"))
      : toast.error("❌ שגיאה במחיקה");
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
    toast.success("📝 עודכן בהצלחה");
    setEditOpen(false);
  };

  /* ────────── render ────────── */
  if (loading) return <p className="p-6">טוען…</p>;
  if (!order) return <p className="p-6">הזמנה לא נמצאה.</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/orders" className="text-blue-600 hover:underline">
        ← חזרה לרשימת הזמנות
      </Link>

      <ClientControlPanel
        order={order}
        onDelete={handleDelete}
        onMarkTest={markAsTest}
        onEdit={() => {
          setNewName(order.name ?? "");
          setNewAddr(order.address ?? "");
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

      {/* ✏️ modal */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded shadow-lg w-full max-w-md"
          >
            <h2 className="text-lg font-bold mb-4">עריכת פרטי לקוח</h2>

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
