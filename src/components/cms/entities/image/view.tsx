"use client";

import { useEffect, useState } from "react";
import UploadImage from "./upload";
import UploadFolder from "./upload-folder";
import ImageGrid from "./ui/image-grid";

export default function ViewImages() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freezeMsg, setFreezeMsg] = useState<string | null>(null); // ← global freeze overlay

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/images");
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
      } catch {
        setError("אירעה שגיאה בטעינת התמונות");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div dir="rtl" lang="he" className="mx-auto max-w-6xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">ניהול תמונות</h1>
        <div className="flex gap-2">
          <UploadImage onUpload={() => window.location.reload()} />
          <UploadFolder onUpload={() => window.location.reload()} />
        </div>
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
        <ImageGrid images={images} onFreeze={setFreezeMsg} />
      )}

      {/* Full-screen freeze overlay */}
      {freezeMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl bg-white px-6 py-4 text-center shadow">
            <p className="text-sm text-gray-700">{freezeMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
