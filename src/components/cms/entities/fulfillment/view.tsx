// app/(cms)/orders/[id]/page.tsx  (ViewOrder)
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { showToast } from "@/components/cms/ui/toast";
import { HeaderHydrator } from "@/components/cms/sections/header/section-header";
import Link from "next/link";
import ClientControlPanel from "@/components/cms/entities/fulfillment/ui/client-control-panel";
import OrderItemList from "@/components/cms/entities/fulfillment/ui/order-item-list";

type PaymentMethod = "" | "credit" | "paybox" | "cash";

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
  // ⬇️ include snapshot fields from DB
  preGroupTotal?: number | null;
  groupDiscountTotal?: number | null;
  deliveryFee?: number | null;
  total?: number | null;
  paymentMethod?: PaymentMethod | null;
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
  inStock?: boolean | null; // from API is nullable
};

type ExtendedItem = Item & { inStock: boolean };

// presence-check helper
const has = (obj: any, key: string) =>
  obj != null && Object.prototype.hasOwnProperty.call(obj, key);

// normalize payment method to a valid select value
const sanitizePaymentMethod = (v: unknown): PaymentMethod =>
  v === "credit" || v === "paybox" || v === "cash" ? v : "";

// fallback pre-group calculator (ONLY used if snapshot is missing)
function calcPreGroupFromItems(items: ExtendedItem[]) {
  let pre = 0;
  for (const it of items) {
    // item-level sale (no group info here; snapshot should normally exist)
    let line = it.unitPrice * it.quantity;
    if (it.saleQuantity && it.salePrice && it.quantity >= it.saleQuantity) {
      const bundles = Math.floor(it.quantity / it.saleQuantity);
      const rest = it.quantity % it.saleQuantity;
      line = bundles * it.salePrice + rest * it.unitPrice;
    }
    if (it.inStock !== false) pre += line;
  }
  return pre;
}

export default function ViewOrder() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<ExtendedItem[]>([]);
  const [loading, setLoad] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddr, setNewAddr] = useState("");

  const [clicks, setClicks] = useState(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      showToast(
        flag ? "✅ ההזמנה סומנה כבדיקה" : "❌ סימון בדיקה הוסר",
        "success"
      );
    } catch {
      showToast("❌ שגיאה בעדכון סטטוס בדיקה", "error");
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
        const ordRes = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        const { order: o, items: raw } = (await ordRes.json()) as {
          order: Order;
          items: Item[];
        };

        const enriched = (raw || []).map((it) => ({
          ...it,
          unitPrice: +it.unitPrice,
          salePrice: it.salePrice !== null ? +it.salePrice : null,
          inStock: it.inStock !== false,
          storageName: it.storageName ?? null,
          storageSort: it.storageSort ?? null,
        }));

        setOrder({
          ...o,
          paymentMethod: sanitizePaymentMethod((o as any).paymentMethod),
          preGroupTotal: o.preGroupTotal != null ? +o.preGroupTotal : null,
          groupDiscountTotal:
            o.groupDiscountTotal != null ? +o.groupDiscountTotal : 0,
          deliveryFee: o.deliveryFee != null ? +o.deliveryFee : null,
          total: o.total != null ? +o.total : null,
        });
        setItems(enriched);
      } catch {
        showToast("❌ שגיאה בטעינת הזמנה", "error");
      } finally {
        setLoad(false);
      }
    })();
  }, [id]);

  const handleNotifyAndWhatsApp = async () => {
    if (!order) return;
    const phone = order.clientPhone
      ?.replace(/[^0-9]/g, "")
      .replace(/^0/, "972");
    if (!phone) {
      showToast("מספר טלפון לא תקין", "error");
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

      window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(
        msg
      )}`;
    } catch {
      showToast("❌ שגיאה בעדכון סטטוס וואטסאפ", "error");
    }
  };

  // Payment method change (server decides isPaid)
  const setPaymentMethod = async (method: PaymentMethod | null) => {
    if (!order) return;
    try {
      const r = await fetch(`/api/orders/${order.orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Failed");

      setOrder((o) =>
        o
          ? {
              ...o,
              paymentMethod: sanitizePaymentMethod(
                (data.paymentMethod as PaymentMethod | null | undefined) ??
                  method ??
                  ""
              ),
              isPaid:
                typeof data.isPaid === "boolean"
                  ? data.isPaid
                  : method != null && method !== "",
            }
          : o
      );
    } catch {
      showToast("❌ שגיאה בעדכון אמצעי תשלום", "error");
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
      showToast("❌ שגיאה בעדכון סטטוס הזמנה", "error");
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
        showToast("❌ שגיאה בעדכון מלאי לפריט", "error");
      });
      return nextState;
    });
  };

  if (loading) return <p className="p-6">טוען…</p>;
  if (!order) return <p className="p-6">הזמנה לא נמצאה.</p>;

  // ---- Totals: prefer DB snapshots; fall back safely ----
  const DELIVERY_THRESHOLD = Number(
    process.env.NEXT_PUBLIC_DELIVERY_THRESHOLD || 90
  );
  const DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);

  const preGroup =
    order.preGroupTotal != null
      ? Number(order.preGroupTotal)
      : calcPreGroupFromItems(items);
  const groupDisc =
    order.groupDiscountTotal != null ? Number(order.groupDiscountTotal) : 0;
  const subtotal = Math.max(0, preGroup - groupDisc);

  const deliveryFee =
    order.deliveryFee != null
      ? Number(order.deliveryFee)
      : subtotal > 0 && subtotal < DELIVERY_THRESHOLD
      ? DELIVERY_FEE
      : 0;

  const grandTotal =
    order.total != null ? Number(order.total) : subtotal + deliveryFee;

  return (
    <main dir="rtl" className="px-4 sm:px-6 md:px-10 max-w-5xl mx-auto">
      <HeaderHydrator title={`הזמנה #${order.orderId}`} />

      <div className="py-6 space-y-6">
        <Link href="/orders" className="text-blue-600 hover:underline">
          ← חזרה לרשימת הזמנות
        </Link>

        <ClientControlPanel
          order={order}
          finalTotal={grandTotal}
          onDelete={async () => {
            if (!order) return;
            if (!confirm("האם אתה בטוח שברצונך למחוק?")) return;
            try {
              const r = await fetch(`/api/orders/${order.orderId}`, {
                method: "DELETE",
              });
              if (!r.ok) throw new Error();
              showToast("🗑️ הזמנה נמחקה", "success");
              window.location.href = "/orders";
            } catch {
              showToast("❌ שגיאה במחיקה", "error");
            }
          }}
          onMarkTest={markAsTest}
          onEdit={() => {
            setNewName(order.clientName ?? "");
            setNewAddr(order.clientAddress ?? "");
            setEditOpen(true);
          }}
          onPaymentChange={setPaymentMethod}
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

        {/* Totals box (snapshot-first) */}
        <div className="text-right rtl border rounded p-4 bg-gray-50">
          <p>ביניים: ₪{subtotal.toFixed(2)}</p>
          <p>
            דמי משלוח:{" "}
            {deliveryFee > 0
              ? `₪${deliveryFee.toFixed(2)}`
              : `₪0 (מעל ${DELIVERY_THRESHOLD}₪)`}
          </p>
          <p className="text-xl font-bold">
            סה״כ לתשלום: ₪{grandTotal.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setEditOpen(false)}
          aria-modal="true"
          role="dialog"
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
                onClick={async () => {
                  if (!order) return;
                  const payload = {
                    name: newName.trim(),
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
                            clientName: has(data, "name")
                              ? data.name
                              : o.clientName,
                            clientAddress: has(data, "address")
                              ? data.address
                              : o.clientAddress,
                            clientPhone: has(data, "phone")
                              ? data.phone
                              : o.clientPhone,
                            isPaid: has(data, "isPaid")
                              ? data.isPaid
                              : o.isPaid,
                            isReady: has(data, "isReady")
                              ? data.isReady
                              : o.isReady,
                            paymentMethod: has(data, "paymentMethod")
                              ? sanitizePaymentMethod(
                                  (data as any).paymentMethod
                                )
                              : o.paymentMethod,
                          }
                        : o
                    );

                    showToast("📝 עודכן בהצלחה", "success");
                    setEditOpen(false);
                  } catch {
                    showToast("❌ שגיאה בעדכון פרטי לקוח", "error");
                  }
                }}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
