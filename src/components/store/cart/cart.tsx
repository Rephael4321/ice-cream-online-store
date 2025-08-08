"use client";

import { useCart } from "@/context/cart-context";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import CartSingleItem from "./ui/cart-single-item";
import ConfirmOrderModal from "./ui/confirm-order-modal";

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

export default function Cart() {
  const {
    cartItems,
    removeFromCart,
    clearCart,
    increaseQuantity,
    decreaseQuantity,
    updateStockStatus,
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

  const total = cartItems
    .filter((item) => item.inStock !== false)
    .map((item) => {
      if (!item.sale) return item.productPrice * item.quantity;
      const bundles = Math.floor(item.quantity / item.sale.amount);
      const remainder = item.quantity % item.sale.amount;
      return bundles * item.sale.price + remainder * item.productPrice;
    })
    .reduce((a, b) => a + b, 0);

  useEffect(() => {
    async function fetchStock(ids: number[]) {
      if (!ids.length) return;

      const res = await fetch("/api/products/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) return;

      const stockMap: Record<number, boolean> = await res.json();
      Object.entries(stockMap).forEach(([id, inStock]) =>
        updateStockStatus(Number(id), inStock)
      );
    }

    if (isOpen && !hasFetchedOnOpen.current) {
      fetchStock(latestIdsRef.current);
      hasFetchedOnOpen.current = true;
    }

    const handleFocus = () => {
      if (isOpen) fetchStock(latestIdsRef.current);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen, updateStockStatus]);

  useEffect(() => {
    if (!isOpen) hasFetchedOnOpen.current = false;
  }, [isOpen]);

  function getOrderItems() {
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

  // When user types a phone for the first time
  const savePhoneNumber = () => {
    const normalized = normalizePhoneForDB(phoneInput);
    if (!isValidMobile(normalized)) {
      alert("נא להזין מספר נייד תקין בפורמט 05XXXXXXXX.");
      return;
    }
    // Persist & move to confirm step
    Cookies.set("phoneNumber", normalized, { expires: 3650, sameSite: "Lax" });
    setPhoneModal(false);
    setPendingPhone(normalized);
    setConfirmPhoneModal(true);
  };

  // If user edits phone during confirm step (free text; we normalize on confirm)
  const updatePendingPhone = (newVal: string) => {
    setPendingPhone(newVal);
  };

  const confirmPhoneAndSend = async () => {
    const normalized = normalizePhoneForDB(pendingPhone || "");
    if (!isValidMobile(normalized)) {
      alert("נא לאשר מספר נייד תקין בפורמט 05XXXXXXXX.");
      return;
    }
    // keep cookie in sync in case user edited here
    Cookies.set("phoneNumber", normalized, { expires: 3650, sameSite: "Lax" });
    setConfirmPhoneModal(false);
    await finalizeOrder(normalized); // ⬅️ always 05XXXXXXXX to DB
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
          data.error?.includes("None of the products")
        ) {
          clearCart();
          toast.error("ההזמנה לא נשלחה – כל המוצרים נמחקו מהמערכת");
        } else {
          toast.error("שגיאה בשליחת ההזמנה");
        }
        return;
      }

      const { orderId, warning } = await res.json();

      if (warning) {
        toast.warning("חלק מהמוצרים לא היו זמינים ונמחקו מההזמנה");
      } else {
        toast.success("ההזמנה נשלחה בהצלחה!");
      }

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
            <div className="mt-4 space-y-3">
              <p className="text-right font-bold">
                סה״כ: {total.toFixed(2)} ש״ח
              </p>
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
        // Step 1: request phone (if not in cookie)
        phoneModal={phoneModal}
        phoneInput={phoneInput}
        onPhoneChange={(e) => setPhoneInput(e.target.value)}
        onPhoneClose={() => setPhoneModal(false)}
        onPhoneSave={savePhoneNumber}
        // Step 2: confirm phone number before sending
        confirmPhoneModal={confirmPhoneModal}
        pendingPhone={pendingPhone || ""}
        onPendingPhoneChange={updatePendingPhone}
        onConfirmPhoneClose={() => setConfirmPhoneModal(false)}
        onConfirmPhoneSend={confirmPhoneAndSend}
        // Post-order WhatsApp confirm
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
