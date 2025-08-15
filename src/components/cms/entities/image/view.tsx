"use client";

import { useEffect, useState } from "react";
import UploadImage from "./upload";
import UploadFolder from "./upload-folder";
import ImageGrid from "./ui/image-grid";

export default function ViewImages() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freezeMsg, setFreezeMsg] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

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

  const toggleImageSelection = (url: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const handleMultiDelete = async () => {
    if (!confirm("האם למחוק את כל התמונות שנבחרו?")) return;

    setFreezeMsg("מוחק תמונות…");
    const deleted: string[] = [];

    for (const url of selectedImages) {
      const res = await fetch("/api/images/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      if (res.ok) deleted.push(url);
    }

    setImages((prev) => prev.filter((img) => !deleted.includes(img)));
    setSelectedImages(new Set());
    setSelectMode(false);
    setFreezeMsg(null);
  };

  return (
    <div dir="rtl" lang="he" className="mx-auto max-w-6xl p-4 sm:p-6 space-y-4">
      {/* 🧭 Top toolbar */}
      {selectMode && (
        <div className="fixed top-[60px] left-1/2 -translate-x-1/2 z-[49] flex justify-between items-center bg-white border mt-12 p-3 rounded shadow w-full max-w-4xl">
          <span className="text-blue-800 font-semibold">
            {selectedImages.size} נבחרו
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectMode(false);
                setSelectedImages(new Set());
              }}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
            >
              ביטול
            </button>
            <button
              onClick={handleMultiDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
            >
              מחק נבחרים
            </button>
          </div>
        </div>
      )}

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
        <ImageGrid
          images={images}
          onFreeze={setFreezeMsg}
          selectMode={selectMode}
          selected={selectedImages}
          onToggleSelect={toggleImageSelection}
          onEnterSelectMode={() => setSelectMode(true)}
        />
      )}

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
