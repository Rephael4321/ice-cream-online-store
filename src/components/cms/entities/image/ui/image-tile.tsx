"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

function getKeyParts(imageUrl: string) {
  const key = decodeURIComponent(new URL(imageUrl).pathname.slice(1)); // e.g. images/שם.png
  const name = key.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const ext = dot >= 0 ? name.slice(dot + 1) : "";
  return { key, name, base, ext };
}

export default function ImageTile({
  url,
  open,
  onToggle,
  onRequestClose,
  onFreeze,
}: {
  url: string;
  open: boolean;
  onToggle: () => void;
  onRequestClose: () => void;
  onFreeze: (msg: string | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside this tile
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) onRequestClose();
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open, onRequestClose]);

  const { key, name, base } = getKeyParts(url);

  const handleRename = async () => {
    const nextName = window.prompt("הכנס/י שם חדש (ללא סיומת):", base);
    if (!nextName || nextName.trim() === base) return;

    try {
      onFreeze("מבצע שינוי שם…");
      const res = await fetch("/api/images/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, newBaseName: nextName }),
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
      const res = await fetch("/api/images/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
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
      className="relative border rounded-xl p-2 shadow-sm transition hover:shadow"
      // kill any accidental focus visualization
      style={{ outline: "none" }}
      onMouseDown={(e) => e.currentTarget.blur?.()}
    >
      {/* Clickable image block (no focus ring) */}
      <div
        role="button"
        tabIndex={-1}
        onFocus={(e) => e.currentTarget.blur()}
        onClick={onToggle}
        className="relative w-full overflow-hidden rounded-lg bg-gray-50 select-none"
        style={{ WebkitTapHighlightColor: "transparent", outline: "none" }}
        title="פתח/י פעולות"
        onMouseDown={(e) => e.preventDefault()} // prevent focus on click
      >
        <div className="aspect-[1/1] w-full">
          <Image
            src={url}
            alt="תמונה שהועלתה"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-contain pointer-events-none"
            loading="lazy"
            draggable={false}
          />
        </div>

        {/* Full-cover overlay (vertically centered buttons) */}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center",
            "bg-black/0 opacity-0",
            "transition-all duration-200 ease-out",
            open ? "bg-black/40 opacity-100" : "",
          ].join(" ")}
          style={{ pointerEvents: open ? "auto" : "none" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onRequestClose();
          }}
        >
          <div
            className={[
              "scale-95 translate-y-1 opacity-0",
              "transition-all duration-200 ease-out",
              open ? "scale-100 translate-y-0 opacity-100" : "",
              "flex flex-col items-stretch gap-2 w-10/12 sm:w-8/12 max-w-[220px]",
            ].join(" ")}
            style={{ outline: "none" }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRename();
              }}
              onMouseDown={(e) => e.preventDefault()}
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
              onMouseDown={(e) => e.preventDefault()}
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
              onMouseDown={(e) => e.preventDefault()}
              className="bg-white/90 hover:bg-white text-gray-900 text-sm px-3 py-2 rounded"
            >
              העתק קישור
            </button>
          </div>
        </div>
      </div>

      {/* Filename under the image (truncated). Hover shows full path; click copies & shows it. */}
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 w-full text-start text-xs text-gray-700 truncate"
        title={key}
        style={{ outline: "none" }}
        onMouseDown={(e) => e.preventDefault()}
      >
        {name || key}
      </button>
    </div>
  );
}
