"use client";

import { useEffect, useState } from "react";
import UploadImage from "./upload";
import ImageGrid from "./ui/image-grid";

export default function ViewImages() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/images")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch images");
        return res.json();
      })
      .then((data) => setImages(Array.isArray(data) ? data : []))
      .catch(() => setError("אירעה שגיאה בטעינת התמונות"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div dir="rtl" lang="he" className="mx-auto max-w-6xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">ניהול תמונות</h1>
        <UploadImage onUpload={() => window.location.reload()} />
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">טוען…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : images.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm text-gray-600">
          אין תמונות עדיין. העלה/י תמונה כדי להתחיל.
        </div>
      ) : (
        <ImageGrid images={images} />
      )}
    </div>
  );
}
