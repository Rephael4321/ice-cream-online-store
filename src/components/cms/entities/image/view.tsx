"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UploadImage from "./upload";
import UploadFolder from "./upload-folder";
import ImageLibraryGrid from "./ui/image-library-grid";
import { api, apiGet } from "@/lib/api/client";

type ImageItem = { url: string; key: string; name: string };

export default function ViewImages() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freezeMsg, setFreezeMsg] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  const router = useRouter();

  // Send user to the products images page after upload
  const goToProductsImages = () => router.replace("/products/images");

  useEffect(() => {
    // Prefetch target route for instant navigation after upload
    router.prefetch("/products/images");
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet("/api/images", { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        // API returns [{ url, key, name }]
        setImages(Array.isArray(data) ? (data as ImageItem[]) : []);
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
      const res = await api("/api/images/delete", {
        method: "DELETE",
        body: { imageUrl: url },
      });
      if (res.ok) deleted.push(url);
    }

    setImages((prev) => prev.filter((img) => !deleted.includes(img.url)));
    setSelectedImages(new Set());
    setSelectMode(false);
    setFreezeMsg(null);
  };

  return (
    <div dir="rtl" lang="he" className="mx-auto max-w-6ל p-4 sm:p-6 space-y-4">
      {/* top bar in select mode */}
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Navigate to /products/images after successful upload */}
          <UploadImage onUpload={goToProductsImages} />
          <UploadFolder onUpload={goToProductsImages} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">טוען…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : images.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm text-gray-600 bg-white">
          אין תמונות עדיין. העלה/י תמונה כדי להתחיל.
        </div>
      ) : (
        <ImageLibraryGrid
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
