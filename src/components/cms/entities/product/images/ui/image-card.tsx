"use client";

import { useState } from "react";
import { ProductImage } from "../list";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api/client";

export default function ImageCard({
  image,
  onDeleted,
}: {
  image: ProductImage;
  /** Called after a successful delete so the list can refresh. */
  onDeleted?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const displayName =
    (image as any).name ?? image.key.split("/").pop() ?? image.key;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    if (!confirm(`למחוק את "${displayName}"?`)) return;
    setDeleting(true);
    try {
      const res = await api("/api/images/delete", {
        method: "DELETE",
        body: { key: image.key },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(
          typeof data?.error === "string" ? data.error : "מחיקה נכשלה"
        );
        return;
      }
      onDeleted?.();
    } catch {
      alert("מחיקה נכשלה");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative border rounded p-2 bg-white shadow-sm hover:shadow-md transition">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        title="מחק תמונה"
        aria-label="מחק תמונה"
        className="absolute start-2 top-2 z-10 rounded-md p-1.5 bg-white/90 text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <Link
        href={`/products/new?image=${encodeURIComponent(image.url)}`}
        className="block cursor-pointer"
      >
        <div className="relative w-full h-40 flex items-center justify-center bg-gray-50">
          <Image
            src={image.url}
            alt={displayName}
            fill
            unoptimized // ✅ disables Next.js optimization for these images
            className="object-contain rounded"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
        <div className="mt-2 text-sm">
          <p className="truncate font-medium" title={displayName}>
            {displayName}
          </p>
          <p className="text-[11px] text-gray-500 truncate" title={image.key}>
            {image.key}
          </p>
          <p className="text-[11px] text-gray-500">
            {image.size ? `${(image.size / 1024).toFixed(1)} KB` : "-"}
          </p>
        </div>
      </Link>
    </div>
  );
}
