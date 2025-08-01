"use client";

import { useCart } from "@/context/cart-context";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import CartSingleItem from "./ui/cart-single-item";
import CartGroupItem from "./ui/cart-group-item";
import ConfirmOrderModal from "./ui/confirm-order-modal";

export default function Cart() {
  const {
    cartItems,
    removeFromCart,
    removeGroupedCategory,
    clearCart,
    getGroupedCart,
    increaseQuantity,
    decreaseQuantity,
    updateStockStatus,
  } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [showWhatsappConfirm, setShowWhatsappConfirm] = useState(false);
  const [hasOutOfStockAtSubmit, setHasOutOfStockAtSubmit] = useState(false);
  const hasFetchedOnOpen = useRef(false);

  const grouped = getGroupedCart();
  const singleItems = cartItems.filter(
    (item) => !item.sale?.fromCategory || !item.sale.category?.id
  );

  const hasOutOfStock = cartItems.some((item) => item.inStock === false);

  const total = [
    ...grouped
      .filter((g) => g.items.every((item) => item.inStock !== false))
      .map((g) => g.totalPrice),
    ...singleItems
      .filter((item) => item.inStock !== false)
      .map((item) => {
        if (!item.sale) return item.productPrice * item.quantity;
        const bundles = Math.floor(item.quantity / item.sale.amount);
        const remainder = item.quantity % item.sale.amount;
        return bundles * item.sale.price + remainder * item.productPrice;
      }),
  ].reduce((a, b) => a + b, 0);

  // ✅ STOCK SYNC ON OPEN AND FOCUS
  useEffect(() => {
    async function fetchStock() {
      if (cartItems.length === 0) return;

      const res = await fetch("/api/products/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: cartItems.map((item) => item.id) }),
      });

      if (!res.ok) return;

      const stockMap: Record<number, boolean> = await res.json();
      Object.entries(stockMap).forEach(([id, inStock]) =>
        updateStockStatus(Number(id), inStock)
      );
    }

    if (isOpen && !hasFetchedOnOpen.current) {
      fetchStock();
      hasFetchedOnOpen.current = true;
    }

    const handleFocus = () => {
      if (isOpen) fetchStock();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen]); // ✅ ONLY isOpen

  // ✅ RESET FLAG ON CLOSE
  useEffect(() => {
    if (!isOpen) {
      hasFetchedOnOpen.current = false;
    }
  }, [isOpen]);

  function getOrderItems() {
    const groupedItems = grouped.flatMap((group) =>
      group.items.map((item) => ({
        productId: item.id,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        unitPrice: item.productPrice,
        saleQuantity: group.amount,
        salePrice: group.price,
      }))
    );

    const singleSaleItems = singleItems.map((item) => ({
      productId: item.id,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      unitPrice: item.productPrice,
      saleQuantity: item.sale?.fromCategory ? null : item.sale?.amount,
      salePrice: item.sale?.fromCategory ? null : item.sale?.price,
    }));

    return [...groupedItems, ...singleSaleItems];
  }

  const isValidPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    return /^05\d{8}$/.test(clean) || /^0(?!5)\d{8}$/.test(clean);
  };

  const finalizeOrder = async (phone: string) => {
    const businessPhone = process.env.NEXT_PUBLIC_PHONE;
    if (!businessPhone) return;

    const outOfStock = cartItems.some((item) => item.inStock === false);
    setHasOutOfStockAtSubmit(outOfStock);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ phone, items: getOrderItems() }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
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
    } catch (err) {
      console.error("❌ Order submission error:", err);
      toast.error("שגיאה בשליחת ההזמנה");
    }
  };

  const initiatePayment = () => {
    const phone = Cookies.get("phoneNumber");
    if (!phone) setPhoneModal(true);
    else finalizeOrder(phone);
  };

  const savePhoneNumber = () => {
    const trimmed = phoneInput.trim().replace(/\D/g, "");
    if (!isValidPhone(trimmed)) {
      alert("נא להזין מספר נייד או טלפון תקין.");
      return;
    }
    Cookies.set("phoneNumber", trimmed, { expires: 3650, sameSite: "Lax" });
    setPhoneModal(false);
    finalizeOrder(trimmed);
  };

  const confirmAndRedirectToWhatsapp = async () => {
    if (!pendingOrderId) return;

    try {
      await fetch(`/api/orders/${pendingOrderId}/notify`, {
        method: "PATCH",
      });
    } catch (err) {
      console.error("Failed to mark order as notified:", err);
      // Optional: You could toast an error here if needed
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
              {grouped.map((group) => (
                <CartGroupItem
                  key={group.categoryId}
                  categoryId={group.categoryId}
                  categoryName={group.categoryName}
                  items={group.items}
                  totalPrice={group.totalPrice}
                  discount={group.discount}
                  onRemove={() => removeGroupedCategory(group.categoryId)}
                />
              ))}

              {singleItems.map((item) => (
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
                className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition cursor-pointer"
              >
                צור הזמנה
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
        showWhatsappConfirm={showWhatsappConfirm}
        onCancelWhatsapp={() => setShowWhatsappConfirm(false)}
        onConfirmWhatsapp={confirmAndRedirectToWhatsapp}
        orderId={pendingOrderId || 0}
        hasOutOfStock={hasOutOfStockAtSubmit}
      />
    </>
  );
}
