"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { ImageItem } from "./image-library-grid";
import { api, apiPost } from "@/lib/api/client";

export default function ImageTile({
  item,
  open,
  onToggle,
  onRequestClose,
  onFreeze,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onEnterSelectMode,
}: {
  item: ImageItem;
  open: boolean;
  onToggle: () => void;
  onRequestClose: () => void;
  onFreeze: (msg: string | null) => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onEnterSelectMode?: () => void;
}) {
  const { url, key, name } = item;

  const rootRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) onRequestClose();
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open, onRequestClose]);

  const handleTouchStart = () => {
    if (!selectMode && onEnterSelectMode)
      touchRef.current = setTimeout(onEnterSelectMode, 600);
  };
  const cancelTouch = () => {
    if (touchRef.current) clearTimeout(touchRef.current);
  };

  // Use display name from index; strip extension for rename prompt default
  const displayBase = name.replace(/\.[^/.]+$/, "");

  const handleRename = async () => {
    const nextName = window.prompt("הכנס/י שם חדש (ללא סיומת):", displayBase);
    if (!nextName || nextName.trim() === displayBase) return;
    try {
      onFreeze("מבצע שינוי שם…");
      const res = await apiPost("/api/images/rename", {
        imageUrl: url,
        newBaseName: nextName,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "שינוי השם נכשל");
        onFreeze(null);
        return;
      }
      window.location.reload();
    } catch {
      alert("שינוי השם נכשל");
      onFreeze(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("למחוק את התמונה הזו?")) return;
    try {
      const res = await api("/api/images/delete", {
        method: "DELETE",
        body: { imageUrl: url },
      });
      if (!res.ok) {
        alert("מחיקה נכשלה");
        return;
      }
      window.location.reload();
    } catch {
      alert("מחיקה נכשלה");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(key);
      alert(`הנתיב הועתק:\n${key}`);
    } catch {
      alert("העתקת הקישור נכשלה");
    }
  };

  return (
    <div
      ref={rootRef}
      dir="rtl"
      className={`relative border rounded-xl p-2 shadow-sm transition hover:shadow ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!selectMode && onEnterSelectMode) onEnterSelectMode();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelTouch}
      onTouchMove={cancelTouch}
    >
      {/* Selection Circle */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (!selectMode && onEnterSelectMode) {
            onEnterSelectMode();
          } else {
            onToggleSelect?.();
          }
        }}
        className={`absolute left-2 top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold z-10
          ${
            selected
              ? "bg-blue-500 text-white border-blue-500"
              : "border-gray-400"
          }
          ${selectMode ? "block" : "hidden"} md:block`}
        style={{ cursor: "pointer" }}
        title="בחר תמונה"
      >
        {selected ? "✔" : ""}
      </div>

      {/* Clickable Image */}
      <div
        role="button"
        tabIndex={-1}
        onFocus={(e) => e.currentTarget.blur()}
        onClick={onToggle}
        className="relative w-full overflow-hidden rounded-lg bg-gray-50 select-none"
        style={{ WebkitTapHighlightColor: "transparent" }}
        title="פתח/י פעולות"
        onMouseDown={(e) => e.preventDefault()}
      >
        <div className="aspect-[1/1] w-full">
          <Image
            src={url}
            alt={name || "תמונה שהועלתה"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-contain pointer-events-none"
            loading="lazy"
            draggable={false}
          />
        </div>

        {/* Actions Overlay */}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center",
            "bg-black/0 opacity-0 transition-all duration-200 ease-out",
            open ? "bg-black/40 opacity-100" : "",
          ].join(" ")}
          style={{ pointerEvents: open ? "auto" : "none" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onRequestClose();
          }}
        >
          <div
            className={[
              "scale-95 translate-y-1 opacity-0 transition-all duration-200 ease-out",
              open ? "scale-100 translate-y-0 opacity-100" : "",
              "flex flex-col items-stretch gap-2 w-10/12 sm:w-8/12 max-w-[220px]",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRename();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded"
            >
              שינוי שם
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded"
            >
              מחיקה
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="bg-white/90 hover:bg-white text-gray-900 text-sm px-3 py-2 rounded"
            >
              העתק קישור
            </button>
          </div>
        </div>
      </div>

      {/* Display name from index */}
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 w-full text-start text-xs text-gray-700 truncate"
        title={key}
      >
        {name || key}
      </button>
    </div>
  );
}
