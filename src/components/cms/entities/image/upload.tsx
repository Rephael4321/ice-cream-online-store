"use client";

import { useState } from "react";

export default function UploadImage({ onUpload }: { onUpload: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setBusy(true);

    const res = await fetch("/api/images/upload-url", {
      method: "POST",
      body: JSON.stringify({ filename: file.name }),
      headers: { "Content-Type": "application/json" },
    });

    const { uploadUrl, fileUrl } = await res.json();

    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    setBusy(false);
    onUpload();
  };

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button
        onClick={handleUpload}
        disabled={!file || busy}
        className="bg-blue-500 text-white px-4 py-1 rounded"
      >
        Upload
      </button>
    </div>
  );
}
