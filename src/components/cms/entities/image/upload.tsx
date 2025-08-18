"use client";

import { useState } from "react";
import { validateImageFile, hashFileSHA256 } from "./utils/upload-utils";

export default function UploadImage({ onUpload }: { onUpload: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    // ✅ Validate file (type + size)
    const validationError = validateImageFile(file);
    if (validationError) {
      setBusy(false);
      setError(validationError);
      return;
    }

    try {
      // 1) Hash locally
      const hash = await hashFileSHA256(file);

      // 2) Ask server: duplicate OR signed URL
      const res = await fetch("/api/images/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          hash,
        }),
      });
      if (!res.ok) throw new Error("failed to create signed url");
      const data = await res.json();

      // If duplicate, skip upload
      if (data.duplicate) {
        setInfo(`התמונה כבר קיימת (תוכן זהה). קובץ קיים: ${data.existingKey}`);
        return;
      }

      // 3) Upload to S3 with signed URL
      const put = await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!put.ok) throw new Error("upload failed");

      // 4) Update server index (hash -> key)
      await fetch("/api/images/update-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: [{ hash, key: data.key, name: file.name, size: file.size }],
        }),
      });

      onUpload();
    } catch (e) {
      console.error(e);
      setError("העלאה נכשלה. נסה/י שוב.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex w-full flex-col sm:flex-row gap-3 sm:items-center"
    >
      <label className="inline-flex w-full sm:w-auto items-center gap-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm"
          aria-label="בחר/י קובץ תמונה"
        />
      </label>

      <button
        onClick={handleUpload}
        disabled={!file || busy}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition"
      >
        {busy ? "מעלה…" : "העלה תמונה"}
      </button>

      {file && (
        <span className="text-xs text-gray-600 truncate" title={file.name}>
          קובץ נבחר: {file.name}
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
      {info && <span className="text-xs text-gray-700">{info}</span>}
    </div>
  );
}
