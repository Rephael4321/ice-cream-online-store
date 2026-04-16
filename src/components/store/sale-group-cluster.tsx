"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/cart-context";

export default function SaleGroupCluster({
  bundleAmount,
  productIds,
  children,
}: {
  bundleAmount?: number;
  productIds?: number[];
  children: ReactNode;
}) {
  const { cartItems } = useCart();

  const selectedQty = useMemo(() => {
    if (!bundleAmount || !productIds?.length) return 0;
    const idSet = new Set(productIds);
    return cartItems.reduce((sum, item) => {
      if (!idSet.has(item.id)) return sum;
      return sum + item.quantity;
    }, 0);
  }, [bundleAmount, cartItems, productIds]);

  const completedBundles =
    bundleAmount && bundleAmount > 0 ? Math.floor(selectedQty / bundleAmount) : 0;
  const currentRoundQty =
    bundleAmount && bundleAmount > 0
      ? (() => {
          const remainder = selectedQty % bundleAmount;
          if (selectedQty > 0 && remainder === 0) return bundleAmount;
          return remainder;
        })()
      : 0;
  const levelColors = [
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
  ];
  const activeColorIndex = bundleAmount
    ? selectedQty <= 0
      ? 0
      : currentRoundQty === bundleAmount
      ? Math.max(0, (completedBundles - 1) % levelColors.length)
      : completedBundles % levelColors.length
    : 0;
  const currentRoundPct =
    bundleAmount && bundleAmount > 0
      ? Math.max(0, Math.min(100, Math.round((currentRoundQty / bundleAmount) * 100)))
      : 0;
  const colorLayers = useMemo(
    () =>
      levelColors.map((colorClass, idx) => {
        const completedSeen = completedBundles >= idx + 1;
        const widthPct =
          idx === activeColorIndex
            ? currentRoundPct
            : completedSeen
            ? 100
            : 0;
        const distanceFromActive =
          (activeColorIndex - idx + levelColors.length) % levelColors.length;
        const zIndex = levelColors.length - distanceFromActive;
        return {
          idx,
          colorClass,
          widthPct,
          zIndex,
          isActive: idx === activeColorIndex,
        };
      }),
    [activeColorIndex, completedBundles, currentRoundPct]
  );
  const prevCompletedRef = useRef(completedBundles);
  const [justReachedBundle, setJustReachedBundle] = useState(false);

  useEffect(() => {
    if (completedBundles > prevCompletedRef.current) {
      setJustReachedBundle(true);
      if (typeof window !== "undefined") {
        void import("canvas-confetti")
          .then(({ default: confetti }) => {
            confetti({
              particleCount: 120,
              spread: 80,
              startVelocity: 45,
              origin: { y: 0.65 },
              zIndex: 2000,
            });
          })
          .catch(() => {
            // Non-blocking UX enhancement: ignore if effect fails.
          });
      }
      const timer = setTimeout(() => setJustReachedBundle(false), 1200);
      prevCompletedRef.current = completedBundles;
      return () => clearTimeout(timer);
    }
    prevCompletedRef.current = completedBundles;
    return;
  }, [completedBundles]);

  return (
    <section
      className={`rounded-2xl border border-emerald-300 bg-emerald-50 shadow-sm transition-all duration-300 ${
        justReachedBundle ? "ring-4 ring-emerald-300 shadow-emerald-300/60" : ""
      }`}
    >
      <div className="px-4 sm:px-6 py-3 border-b border-emerald-300 bg-emerald-100/70 space-y-2">
        <p className="text-lg sm:text-xl font-semibold text-emerald-900 text-center">
          אפשר לשלב מוצרים שונים בקבוצה - הכמות הכוללת נספרת יחד למבצע.
        </p>

        {bundleAmount && bundleAmount > 0 && productIds?.length ? (
          <div className="space-y-1">
            <div className="flex flex-col items-center gap-1 text-lg sm:text-xl font-semibold text-emerald-900 text-center">
              <span>
                נבחרו {currentRoundQty} מתוך {bundleAmount} למימוש המבצע
              </span>
              <span
                className={completedBundles > 0 ? "opacity-100" : "opacity-0"}
                aria-hidden={completedBundles === 0}
              >
                {completedBundles > 0
                  ? completedBundles === 1
                    ? "הושלמה חבילה 1"
                    : `הושלמו ${completedBundles} חבילות`
                  : "\u00A0"}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-emerald-200 overflow-hidden relative">
              {colorLayers.map((layer) => (
                <div
                  key={`level-${layer.idx}`}
                  className={`absolute right-0 top-0 h-full transition-all duration-300 ${
                    justReachedBundle &&
                    layer.isActive
                      ? `${layer.colorClass} animate-pulse`
                      : layer.colorClass
                  }`}
                  style={{ width: `${layer.widthPct}%`, zIndex: layer.zIndex }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-4 sm:p-6 bg-emerald-50/80">{children}</div>
    </section>
  );
}
