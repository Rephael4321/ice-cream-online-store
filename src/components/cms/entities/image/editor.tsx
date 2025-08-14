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
    if (!confirm("Are you sure you want to delete this image?")) return;

    setBusy(true);
    const res = await fetch("/api/images/delete", {
      method: "DELETE",
      body: JSON.stringify({ imageUrl }),
      headers: { "Content-Type": "application/json" },
    });

    setBusy(false);

    if (res.ok) {
      showToast("Image deleted");
      onDelete();
    } else {
      showToast("Failed to delete image");
    }
  };

  return (
    <div className="flex justify-between items-center mt-2 text-sm">
      <code className="truncate text-gray-500 max-w-[60%]">{imageUrl}</code>
      <button
        className="text-red-600 text-xs underline disabled:opacity-50"
        onClick={handleDelete}
        disabled={busy}
      >
        Delete
      </button>
    </div>
  );
}
