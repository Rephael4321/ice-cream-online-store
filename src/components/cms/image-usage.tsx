"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type ImageMeta = {
  name: string;
  path: string;
  size: number;
  used: boolean;
  usageCount: number;
  width: number;
  height: number;
};

export default function ImageUsage() {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetch("/api/images")
      .then((res) => res.json())
      .then(setImages);
  }, []);

  const total = images.length;
  const used = images.filter((img) => img.used).length;
  const unused = total - used;
  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  const avgSize = total > 0 ? totalSize / total : 0;
  const avgWidth =
    images.reduce((sum, img) => sum + img.width, 0) / (total || 1);
  const avgHeight =
    images.reduce((sum, img) => sum + img.height, 0) / (total || 1);
  const largest = images.reduce((a, b) => (a.size > b.size ? a : b), images[0]);
  const smallest = images.reduce(
    (a, b) => (a.size < b.size ? a : b),
    images[0]
  );

  const maxSize = 300 * 1024;
  const maxDimension = 1000;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">📦 סטטיסטיקת תמונות</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
          onClick={() => setShowStats(true)}
        >
          📊 הצג נתונים
        </button>
      </div>

      {showStats && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-start pt-24 overflow-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">נתוני תמונות</h2>
              <button
                onClick={() => setShowStats(false)}
                className="text-red-500 font-bold cursor-pointer"
              >
                ✖ סגור
              </button>
            </div>

            <ul className="space-y-2 text-sm">
              <li>
                🖼️ סה״כ תמונות: <b>{total}</b>
              </li>
              <li>
                🟢 בשימוש: <b>{used}</b>
              </li>
              <li>
                🔴 לא בשימוש: <b>{unused}</b>
              </li>
              <li>
                📦 גודל כולל: <b>{(totalSize / 1024).toFixed(1)} KB</b>
              </li>
              <li>
                📐 גודל ממוצע:{" "}
                <b>
                  {Math.round(avgWidth)}×{Math.round(avgHeight)}
                </b>
              </li>
              <li>
                📁 גודל קובץ ממוצע: <b>{(avgSize / 1024).toFixed(1)} KB</b>
              </li>
              <li>
                🔍 הגדולה ביותר: <b>{largest?.name}</b> (
                {(largest?.size / 1024).toFixed(1)} KB, {largest.width}×
                {largest.height})
              </li>
              <li>
                🪶 הקטנה ביותר: <b>{smallest?.name}</b> (
                {(smallest?.size / 1024).toFixed(1)} KB, {smallest.width}×
                {smallest.height})
              </li>
            </ul>

            <hr className="my-2" />

            <div>
              <h3 className="font-bold text-md mb-2">📋 המלצות לגודל תמונות</h3>
              <table className="w-full text-sm border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">שימוש</th>
                    <th className="border px-2 py-1">מימדים מקסימליים</th>
                    <th className="border px-2 py-1">גודל קובץ מקסימלי</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-2 py-1 text-center">
                      תצוגה כללית
                    </td>
                    <td className="border px-2 py-1 text-center">1000×1000</td>
                    <td className="border px-2 py-1 text-center">300 KB</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-2">
                כל תמונה שעוברת את המגבלה תסומן באזהרה 🚨.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.map((img) => {
          const isTooBig =
            img.size > maxSize ||
            img.width > maxDimension ||
            img.height > maxDimension;

          return (
            <div
              key={img.path}
              className={`border p-2 rounded relative ${
                img.used ? "bg-green-50" : "bg-red-50"
              }`}
            >
              {isTooBig && (
                <div className="absolute top-1 left-1 text-red-600 text-lg">
                  🚨
                </div>
              )}
              <Image
                src={img.path}
                alt={img.name}
                width={img.width || 100}
                height={img.height || 100}
                className="w-full h-24 object-contain mb-2"
              />
              <div className="text-sm font-medium break-words">{img.name}</div>
              <div className="text-xs text-gray-500">
                {(img.size / 1024).toFixed(1)} KB
              </div>
              <div className="text-xs text-gray-500">
                {img.width}×{img.height} פיקסלים
              </div>
              <div
                className={`text-xs ${
                  img.used ? "text-green-700" : "text-red-700"
                }`}
              >
                {img.used ? `בשימוש (${img.usageCount})` : "לא בשימוש"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
