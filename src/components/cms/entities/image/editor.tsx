"use client";

import { useState } from "react";
import { showToast } from "@/components/cms/ui/toast";

export default function ImageEditor({
  imageUrl,
  onDelete,
}: {
  imageUrl: string;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!confirm("למחוק את התמונה הזו?")) return;

    setBusy(true);
    try {
      const res = await fetch("/api/images/delete", {
        method: "DELETE",
        body: JSON.stringify({ imageUrl }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        showToast("התמונה נמחקה");
        onDelete();
      } else {
        showToast("מחיקה נכשלה");
      }
    } catch {
      showToast("מחיקה נכשלה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir="rtl" className="flex justify-between items-center mt-2 text-sm">
      <code className="truncate text-gray-500 max-w-[60%]" title={imageUrl}>
        {imageUrl}
      </code>
      <button
        className="text-red-700 hover:text-red-800 text-xs underline disabled:opacity-50"
        onClick={handleDelete}
        disabled={busy}
      >
        {busy ? "מוחק…" : "מחק"}
      </button>
    </div>
  );
}
