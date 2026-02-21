"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: number;
  address: string | null;
  addressLat: number | null;
  addressLng: number | null;
};

export function AddressDisplay({ orderId, address, addressLat, addressLng }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const hasWazeCoords = addressLat != null && addressLng != null && Number.isFinite(addressLat) && Number.isFinite(addressLng);

  const openWaze = useCallback(() => {
    if (!hasWazeCoords) return;
    window.open(
      `https://waze.com/ul?ll=${addressLat},${addressLng}&navigate=yes`,
      "_blank",
      "noopener,noreferrer"
    );
    setMenuOpen(false);
  }, [hasWazeCoords, addressLat, addressLng]);

  const openSetAddress = useCallback(() => {
    router.push(`/orders/${orderId}/address`);
    setMenuOpen(false);
  }, [orderId, router]);

  const showContextMenu = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if ("button" in e && e.button !== 2) return;
      didLongPressRef.current = true;
      const x = "touches" in e ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
      const y = "touches" in e ? e.touches[0]?.clientY ?? e.clientY : e.clientY;
      setMenuPos({ x, y });
      setMenuOpen(true);
    },
    []
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    didLongPressRef.current = false;
    longPressRef.current = setTimeout(() => {
      longPressRef.current = null;
      didLongPressRef.current = true;
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
      setMenuOpen(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (didLongPressRef.current) {
        didLongPressRef.current = false;
        return;
      }
      e.preventDefault();
      if (hasWazeCoords) {
        openWaze();
      } else {
        openSetAddress();
      }
    },
    [hasWazeCoords, openWaze, openSetAddress]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      didLongPressRef.current = true;
      setMenuPos({ x: e.clientX, y: e.clientY });
      setMenuOpen(true);
    },
    []
  );

  return (
    <span className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        className="cursor-pointer text-left underline decoration-dotted hover:decoration-solid focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
        title={hasWazeCoords ? "לחץ לניווט ב-Waze" : "לחץ להגדרת כתובת לניווט"}
        aria-label={hasWazeCoords ? "כתובת לניווט ב-Waze" : "כתובת – הגדר לניווט"}
      >
        {address ?? "—"}
      </button>
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => {
              didLongPressRef.current = false;
              setMenuOpen(false);
            }}
          />
          <div
            role="menu"
            className="fixed z-50 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            style={{ left: menuPos.x, top: menuPos.y, transform: "translate(-50%, -50%)" }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={openWaze}
              disabled={!hasWazeCoords}
              className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ניווט ב-Waze
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={openSetAddress}
              className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100"
            >
              עדכון כתובת
            </button>
          </div>
        </>
      )}
    </span>
  );
}
