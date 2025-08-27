"use client";

import { useCart } from "@/context/cart-context";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import CartSingleItem from "./ui/cart-single-item";
import ConfirmOrderModal from "./ui/confirm-order-modal";

// ---------- utils ----------
const normalizePhoneForDB = (input: string) => {
  let d = (input || "").replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  if (d.length === 9 && d.startsWith("5")) d = "0" + d;
  return d;
};
const isValidMobile = (input: string) =>
  /^05\d{8}$/.test(normalizePhoneForDB(input));
const formatPhonePretty = (input: string) => {
  const d = normalizePhoneForDB(input);
  return d.length === 10
    ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
    : d;
};

// ---------- group discount allocator ----------
function allocateGroupDiscounts(
  items: {
    id: number;
    quantity: number;
    productPrice: number;
    inStock?: boolean;
    // @ts-ignore – provided by context on the item
    saleGroup?: {
      id: number;
      quantity: number;
      salePrice: number;
      unitPrice: number | null;
    } | null;
  }[]
) {
  const perItem = new Map<number, number>();
  let total = 0;

  const groups = new Map<
    number,
    {
      unitPrice: number;
      bundleQty: number;
      bundlePrice: number;
      members: typeof items;
    }
  >();

  for (const it of items) {
    const g = (it as any).saleGroup;
    if (!g || !g.id || !g.quantity || !g.salePrice) continue;
    const unitPrice = g.unitPrice ?? it.productPrice;
    if (!groups.has(g.id)) {
      groups.set(g.id, {
        unitPrice,
        bundleQty: g.quantity,
        bundlePrice: g.salePrice,
        members: [],
      });
    }
    groups.get(g.id)!.members.push(it);
  }

  for (const [, grp] of groups) {
    const members = grp.members.filter(
      (m) => m.inStock !== false && m.quantity > 0
    );
    const totalQty = members.reduce((a, b) => a + b.quantity, 0);
    const bundles = Math.floor(totalQty / grp.bundleQty);
    if (bundles <= 0) continue;

    const regular = bundles * grp.bundleQty * grp.unitPrice;
    const onSale = bundles * grp.bundlePrice;
    let discount = Math.max(0, regular - onSale);
    if (discount <= 0) continue;

    total += discount;

    // proportional split by quantity; reconcile rounding to last item
    const sumQ = totalQty || 1;
    let allocated = 0;
    for (let i = 0; i < members.length; i++) {
      const isLast = i === members.length - 1;
      const m = members[i];
      const raw = (m.quantity / sumQ) * discount;
      const part = isLast
        ? Math.max(0, discount - allocated)
        : Math.round(raw * 100) / 100;
      allocated = Math.round((allocated + part) * 100) / 100;
      perItem.set(m.id, (perItem.get(m.id) || 0) + part);
    }
  }

  return { perItem, total };
}

export default function Cart() {
  const {
    cartItems,
    removeFromCart,
    clearCart,
    increaseQuantity,
    decreaseQuantity,
    updateStockStatus,
    refreshStockStatus,
    refreshSaleGroups, // ⬅️ from context
  } = useCart();

  const [isOpen, setIsOpen] = useState(false);

  // Phone & confirmation modals
  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [confirmPhoneModal, setConfirmPhoneModal] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  // Post-order WhatsApp confirm
  const [showWhatsappConfirm, setShowWhatsappConfirm] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [hasOutOfStockAtSubmit, setHasOutOfStockAtSubmit] = useState(false);

  // Submission guard
  const [submitting, setSubmitting] = useState(false);

  const hasFetchedOnOpen = useRef(false);
  const latestIdsRef = useRef<number[]>([]);
  useEffect(() => {
    latestIdsRef.current = cartItems.map((i) => i.id);
  }, [cartItems]);

  const hasOutOfStock = cartItems.some((item) => item.inStock === false);

  // ---------- totals: item-sale first, then group allocation ----------
  // IMPORTANT: if item participates in a sale group, DO NOT apply per-item sale here.
  const preGroupTotal = cartItems
    .filter((item) => item.inStock !== false)
    .map((item) => {
      const inGroup = Boolean((item as any).saleGroup);
      if (!item.sale || inGroup) {
        return item.productPrice * item.quantity;
      }
      const bundles = Math.floor(item.quantity / item.sale.amount);
      const remainder = item.quantity % item.sale.amount;
      return bundles * item.sale.price + remainder * item.productPrice;
    })
    .reduce((a, b) => a + b, 0);

  const pricingItems = cartItems.map((i) => ({
    id: i.id,
    quantity: i.quantity,
    productPrice: i.productPrice,
    inStock: i.inStock,
    // @ts-ignore – populated by context after fetch
    saleGroup: (i as any).saleGroup ?? null,
  }));

  const { perItem: perItemGroupDiscount, total: groupDiscountTotal } =
    allocateGroupDiscounts(pricingItems);

  // 🔧 Delivery config from env (client-safe)
  const DELIVERY_THRESHOLD = Number(
    process.env.NEXT_PUBLIC_DELIVERY_THRESHOLD || 90
  );
  const DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);

  // NEW: subtotal, delivery, grand total (client display; server is authoritative)
  const subtotal = Math.max(0, preGroupTotal - groupDiscountTotal);
  const deliveryFee =
    subtotal > 0 && subtotal < DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFee;
  const remainingForFree = Math.max(0, DELIVERY_THRESHOLD - subtotal);

  // ---------- background fetches on open/focus ----------
  useEffect(() => {
    async function run(ids: number[]) {
      if (!ids.length) return;
      // stock
      const res = await fetch("/api/products/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const stockMap: Record<number, boolean> = await res.json();
        Object.entries(stockMap).forEach(([id, inStock]) =>
          updateStockStatus(Number(id), inStock)
        );
      }
      // sale-groups for any missing
      await refreshSaleGroups();
    }

    if (isOpen && !hasFetchedOnOpen.current) {
      run(latestIdsRef.current);
      hasFetchedOnOpen.current = true;
    }

    const handleFocus = () => {
      if (isOpen) {
        refreshStockStatus();
        refreshSaleGroups();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen, updateStockStatus, refreshStockStatus, refreshSaleGroups]);

  useEffect(() => {
    if (!isOpen) hasFetchedOnOpen.current = false;
  }, [isOpen]);

  function getOrderItems() {
    // server is authoritative; we still send current client snapshot for UX
    return cartItems.map((item) => ({
      productId: item.id,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      unitPrice: item.productPrice,
      saleQuantity: item.sale?.amount ?? null,
      salePrice: item.sale?.price ?? null,
      inStock: item.inStock,
    }));
  }

  // === Entry point now always leads to a confirm step ===
  const initiatePayment = () => {
    if (cartItems.length === 0) return;

    const allOOS = cartItems.every((i) => i.inStock === false);
    if (allOOS) {
      toast.error("כל המוצרים אזלו מהמלאי — לא ניתן לשלוח הזמנה");
      return;
    }

    const cookiePhone = Cookies.get("phoneNumber");
    if (cookiePhone) {
      const normalized = normalizePhoneForDB(cookiePhone);
      setPendingPhone(normalized);
      setConfirmPhoneModal(true);
    } else {
      setPhoneModal(true);
    }
  };

  const savePhoneNumber = () => {
    const normalized = normalizePhoneForDB(phoneInput);
    if (!isValidMobile(normalized)) {
      alert("נא להזין מספר נייד תקין בפורמט 05XXXXXXXX.");
      return;
    }
    Cookies.set("phoneNumber", normalized, { expires: 3650, sameSite: "Lax" });
    setPhoneModal(false);
    setPendingPhone(normalized);
    setConfirmPhoneModal(true);
  };

  const updatePendingPhone = (newVal: string) => setPendingPhone(newVal);

  const confirmPhoneAndSend = async () => {
    const normalized = normalizePhoneForDB(pendingPhone || "");
    if (!isValidMobile(normalized)) {
      alert("נא לאשר מספר נייד תקין בפורמט 05XXXXXXXX.");
      return;
    }
    Cookies.set("phoneNumber", normalized, { expires: 3650, sameSite: "Lax" });
    setConfirmPhoneModal(false);
    await finalizeOrder(normalized);
  };

  const finalizeOrder = async (phone: string) => {
    if (submitting) return;
    setSubmitting(true);
    const businessPhone = process.env.NEXT_PUBLIC_PHONE;
    if (!businessPhone) {
      setSubmitting(false);
      toast.error("חסר מספר וואטסאפ של העסק");
      return;
    }

    const outOfStock = cartItems.some((item) => item.inStock === false);
    setHasOutOfStockAtSubmit(outOfStock);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ phone, items: getOrderItems() }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (
          res.status === 400 &&
          (data as any).error?.includes("None of the products")
        ) {
          clearCart();
          toast.error("ההזמנה לא נשלחה – כל המוצרים נמחקו מהמערכת");
        } else {
          toast.error("שגיאה בשליחת ההזמנה");
        }
        return;
      }

      const { orderId, warning } = await res.json();

      if (warning) toast.warning("חלק מהמוצרים לא היו זמינים ונמחקו מההזמנה");
      else toast.success("ההזמנה נשלחה בהצלחה!");

      setPendingOrderId(orderId);
      setShowWhatsappConfirm(true);
      clearCart();
      setIsOpen(false);
    } catch (err) {
      console.error("❌ Order submission error:", err);
      toast.error("שגיאה בשליחת ההזמנה");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAndRedirectToWhatsapp = async () => {
    if (!pendingOrderId) return;
    try {
      await fetch(`/api/orders/${pendingOrderId}/notify`, { method: "PATCH" });
    } catch (err) {
      console.error("Failed to mark order as notified:", err);
    }

    const phoneNumber = (process.env.NEXT_PUBLIC_PHONE || "").replace(
      /\D/g,
      ""
    );
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const orderUrl = `${baseUrl}/order/${pendingOrderId}`;
    const msg = `מספר הזמנה ${pendingOrderId}.\n\nניתן לצפות בפירוט הזמנה בקישור הבא:\n${orderUrl}`;

    window.location.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      msg
    )}`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-red-400 text-white px-4 py-2 rounded cursor-pointer text-sm sm:text-base"
      >
        עגלת קניות ({cartItems.length})
      </button>

      {isOpen && (
        <div className="fixed top-0 left-0 h-full w-full sm:w-80 bg-white shadow-lg flex flex-col p-4 z-[1000] transition-all">
          <button
            onClick={() => setIsOpen(false)}
            className="self-end text-xl font-bold text-red-500 hover:text-red-700 mb-4 cursor-pointer"
          >
            ✕
          </button>

          {cartItems.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">העגלה ריקה</p>
          ) : (
            <ul className="flex flex-col gap-4 overflow-y-auto flex-grow">
              {cartItems.map((item) => (
                <CartSingleItem
                  key={item.id}
                  item={item}
                  perItemGroupDiscount={Number(
                    perItemGroupDiscount.get(item.id) || 0
                  )}
                  onDecrease={() => decreaseQuantity(item.id)}
                  onIncrease={() => increaseQuantity(item.id)}
                  onRemove={() => removeFromCart(item.id)}
                />
              ))}
            </ul>
          )}

          {hasOutOfStock && (
            <p className="text-red-600 text-sm text-center">
              חלק מהמוצרים אזלו מהמלאי
            </p>
          )}

          {cartItems.length > 0 && (
            <div className="mt-4 space-y-3 text-right">
              <div className="space-y-1">
                <p>ביניים: {subtotal.toFixed(2)} ש״ח</p>
                {deliveryFee > 0 ? (
                  <p>דמי משלוח: {deliveryFee.toFixed(2)} ש״ח</p>
                ) : (
                  <p className="text-green-600">
                    דמי משלוח: 0 ש״ח (מעל {DELIVERY_THRESHOLD}₪)
                  </p>
                )}
                <p className="font-bold">
                  סה״כ לתשלום: {grandTotal.toFixed(2)} ש״ח
                </p>
                {subtotal > 0 && subtotal < DELIVERY_THRESHOLD && (
                  <p className="text-xs text-yellow-700 bg-yellow-100 rounded px-2 py-1 inline-block mt-1">
                    הוסיפו עוד {remainingForFree.toFixed(2)} ₪ למשלוח חינם
                  </p>
                )}
              </div>

              <button
                onClick={initiatePayment}
                disabled={submitting || cartItems.length === 0}
                className="w-full bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2 rounded hover:bg-green-600 transition cursor-pointer"
              >
                {submitting ? "שולח..." : "צור הזמנה"}
              </button>
              <button
                onClick={clearCart}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 transition cursor-pointer"
              >
                ניקוי עגלה
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmOrderModal
        phoneModal={phoneModal}
        phoneInput={phoneInput}
        onPhoneChange={(e) => setPhoneInput(e.target.value)}
        onPhoneClose={() => setPhoneModal(false)}
        onPhoneSave={savePhoneNumber}
        confirmPhoneModal={confirmPhoneModal}
        pendingPhone={pendingPhone || ""}
        onPendingPhoneChange={updatePendingPhone}
        onConfirmPhoneClose={() => setConfirmPhoneModal(false)}
        onConfirmPhoneSend={confirmPhoneAndSend}
        showWhatsappConfirm={showWhatsappConfirm}
        onCancelWhatsapp={() => setShowWhatsappConfirm(false)}
        onConfirmWhatsapp={confirmAndRedirectToWhatsapp}
        orderId={pendingOrderId || 0}
        hasOutOfStock={hasOutOfStockAtSubmit}
        formatPhone={formatPhonePretty}
      />
    </>
  );
}
