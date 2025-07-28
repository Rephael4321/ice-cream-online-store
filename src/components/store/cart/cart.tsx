"use client";

import { useCart } from "@/context/cart-context";
import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import Image from "next/image";

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

  const hasFetchedRef = useRef(false);

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
      Object.entries(stockMap).forEach(([id, inStock]) => {
        updateStockStatus(Number(id), inStock);
      });
    }

    if (isOpen && !hasFetchedRef.current) {
      fetchStock();
      hasFetchedRef.current = true;
    }

    const handleFocus = () => fetchStock();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen]);

  const grouped = getGroupedCart();
  const singleItems = cartItems.filter(
    (item) => !item.sale?.fromCategory || !item.sale.category?.id
  );

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

  const initiatePayment = () => {
    const phone = Cookies.get("phoneNumber");
    if (!phone) {
      setPhoneModal(true);
    } else {
      finalizeOrder(phone);
    }
  };

  const isValidPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    const isMobile = /^05\d{8}$/.test(clean);
    const isLandline = /^0(?!5)\d{8}$/.test(clean);
    return isMobile || isLandline;
  };

  const finalizeOrder = async (phone: string) => {
    const businessPhone = process.env.NEXT_PUBLIC_PHONE;
    if (!businessPhone) return;

    const payload = {
      phone,
      items: getOrderItems(),
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Failed to create order:", text);
      alert("שגיאה בשליחת ההזמנה");
      return;
    }

    const { orderId } = await res.json();
    setPendingOrderId(orderId);
    setShowWhatsappConfirm(true);
    clearCart();
  };

  const savePhoneNumber = () => {
    const trimmed = phoneInput.trim().replace(/\D/g, "");
    if (!isValidPhone(trimmed)) {
      alert("נא להזין מספר נייד או טלפון תקין.");
      return;
    }

    Cookies.set("phoneNumber", trimmed, {
      expires: 3650,
      sameSite: "Lax",
    });

    setPhoneModal(false);
    finalizeOrder(trimmed);
  };

  const confirmAndRedirectToWhatsapp = () => {
    if (!pendingOrderId) return;

    const businessPhone = process.env.NEXT_PUBLIC_PHONE!;
    const phoneNumber = businessPhone.replace(/\D/g, "");
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const orderUrl = `${baseUrl}/order/${pendingOrderId}`;

    const msg = `מספר הזמנה ${pendingOrderId}.\n\nניתן לצפות בפירוט הזמנה בקישור הבא:\n${orderUrl}`;
    const encodedMsg = encodeURIComponent(msg);

    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMsg}`;
    window.location.href = whatsappURL;
  };

  const hasOutOfStock = cartItems.some((item) => item.inStock === false);

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
            className="self-end text-xl font-bold text-red-500 hover:text-red-700 mb-4 cursor-pointer transition"
          >
            ✕
          </button>

          {cartItems.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">העגלה ריקה</p>
          ) : (
            <ul className="flex flex-col gap-4 overflow-y-auto flex-grow">
              {grouped.map((group) => (
                <li key={group.categoryId} className="border-b pb-2 text-sm">
                  <div className="flex justify-between items-center">
                    <p className="font-bold">
                      מבצע מקטגוריית {group.categoryName}
                    </p>
                    <button
                      onClick={() => removeGroupedCategory(group.categoryId)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      הסר
                    </button>
                  </div>
                  <ul className="pl-3 list-disc text-xs">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        {item.productName} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                  <p>סה״כ: {group.totalPrice.toFixed(2)} ש״ח</p>
                  {group.discount > 0 && (
                    <p className="text-green-600 text-xs">
                      חסכת: {group.discount.toFixed(2)} ש״ח
                    </p>
                  )}
                </li>
              ))}

              {singleItems.map((item) => {
                const baseTotal = item.productPrice * item.quantity;
                let finalPrice = baseTotal;
                let discount = 0;

                if (item.sale && !item.sale.fromCategory) {
                  const bundles = Math.floor(item.quantity / item.sale.amount);
                  const remainder = item.quantity % item.sale.amount;
                  finalPrice =
                    bundles * item.sale.price + remainder * item.productPrice;
                  discount = baseTotal - finalPrice;
                }

                return (
                  <li
                    key={item.id}
                    className={`flex gap-3 items-start border-b pb-2 text-sm ${
                      item.inStock === false ? "opacity-50" : ""
                    }`}
                  >
                    <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-gray-200">
                      <Image
                        src={item.productImage || "/placeholder.png"}
                        alt={item.productName}
                        fill
                        className="object-contain bg-white"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{item.productName}</p>
                      {item.inStock === false && (
                        <p className="text-red-600 text-xs mt-1">
                          המוצר לא זמין כרגע
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          disabled={item.inStock === false}
                          className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => increaseQuantity(item.id)}
                          disabled={item.inStock === false}
                          className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <p>מחיר: {finalPrice.toFixed(2)} ש״ח</p>
                      {discount > 0 && (
                        <p className="text-green-600 text-xs">
                          חסכת: {discount.toFixed(2)} ש״ח
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
                    >
                      הסר
                    </button>
                  </li>
                );
              })}
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

      {/* Phone modal and WhatsApp confirm (unchanged) */}
      {phoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1100]">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4 text-center">
              נא להזין טלפון לצורך ביצוע הזמנה
            </h2>
            <input
              type="tel"
              placeholder="למשל: 050-123-4567"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="w-full border px-3 py-2 mb-4 rounded text-right"
            />
            <div className="flex justify-between gap-4">
              <button
                onClick={() => setPhoneModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={savePhoneNumber}
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 cursor-pointer"
              >
                שמור והמשך
              </button>
            </div>
          </div>
        </div>
      )}

      {showWhatsappConfirm && pendingOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1100]">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center space-y-4">
            <p className="text-lg font-bold">
              ההזמנה בוצעה בהצלחה. מספר הזמנה {pendingOrderId}.
              <br />
              בכדי להבטיח אימות הזמנה, שלחו הודעה לספק השירות.
            </p>
            <div className="flex gap-4">
              <button
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 cursor-pointer"
                onClick={() => setShowWhatsappConfirm(false)}
              >
                לא עכשיו
              </button>
              <button
                className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 cursor-pointer"
                onClick={confirmAndRedirectToWhatsapp}
              >
                כן, שלח
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
