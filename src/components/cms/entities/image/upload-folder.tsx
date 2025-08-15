"use client";

import { useRef, useState } from "react";

type Item = {
  file: File;
  key: string; // images/…/…/name.ext
  status: "idle" | "signing" | "uploading" | "done" | "error";
  progress: number; // 0..100 (best effort)
  error?: string;
};

export default function UploadFolder({ onUpload }: { onUpload: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const pickFolder = () => inputRef.current?.click();

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // Build keys using webkitRelativePath if available
    const mapped: Item[] = files.map((file) => {
      const rel = (file as any).webkitRelativePath || file.name; // e.g. MyFolder/sub/a.png
      // Normalize slashes & ensure images/ prefix (API enforces too – double safe)
      const relClean = rel.replace(/\\/g, "/").replace(/^\/+/, "");
      const key = relClean.startsWith("images/")
        ? relClean
        : `images/${relClean}`;
      return { file, key, status: "idle", progress: 0 };
    });
    setItems(mapped);
  };

  const uploadAll = async () => {
    if (!items.length) return;
    setBusy(true);

    const next = [...items];
    setItems(next);

    for (let i = 0; i < next.length; i++) {
      const it = next[i];
      try {
        // 1) get signed URL for this key
        it.status = "signing";
        setItems([...next]);

        const signRes = await fetch("/api/images/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: it.key }),
        });
        if (!signRes.ok) {
          const msg =
            (await signRes.json().catch(() => ({})))?.error || "signing failed";
          throw new Error(msg);
        }
        const { uploadUrl } = await signRes.json();

        // 2) PUT file to S3
        it.status = "uploading";
        setItems([...next]);

        // NOTE: fetch won't give granular progress; show 0→100 best-effort
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": it.file.type || "application/octet-stream",
          },
          body: it.file,
        });
        if (!putRes.ok) throw new Error(`upload failed (${putRes.status})`);

        it.status = "done";
        it.progress = 100;
        setItems([...next]);
      } catch (err: any) {
        it.status = "error";
        it.error = err?.message || "upload error";
        setItems([...next]);
      }
    }

    setBusy(false);
    // If all done (no errors), refresh list
    if (next.every((x) => x.status === "done")) onUpload();
  };

  const total = items.length;
  const done = items.filter((x) => x.status === "done").length;
  const errs = items.filter((x) => x.status === "error").length;

  return (
    <div dir="rtl" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          // Folder picker: works in Chromium/Edge; Safari uses directory as well
          // @ts-ignore
          webkitdirectory="true"
          // @ts-ignore
          directory="true"
          multiple
          className="hidden"
          onChange={onPick}
        />
        <button
          type="button"
          onClick={pickFolder}
          disabled={busy}
          className="bg-gray-700 hover:bg-gray-800 text-white text-sm px-3 py-2 rounded"
        >
          בחרי תיקייה
        </button>
        <button
          type="button"
          onClick={uploadAll}
          disabled={!items.length || busy}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm px-3 py-2 rounded"
        >
          העלאת תיקייה
        </button>
        {total > 0 && (
          <span className="text-xs text-gray-600">
            {errs > 0
              ? `הושלמו ${done}/${total} | שגיאות: ${errs}`
              : `הושלמו ${done}/${total}`}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="max-h-64 overflow-auto rounded border">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-right p-2 font-medium">קובץ</th>
                <th className="text-right p-2 font-medium">נתיב (S3)</th>
                <th className="text-right p-2 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td
                    className="p-2 truncate max-w-[160px]"
                    title={it.file.name}
                  >
                    {it.file.name}
                  </td>
                  <td className="p-2 truncate max-w-[280px]" title={it.key}>
                    {it.key}
                  </td>
                  <td className="p-2">
                    {it.status === "idle" && "מוכן"}
                    {it.status === "signing" && "יוצר קישור…"}
                    {it.status === "uploading" && "מעלה…"}
                    {it.status === "done" && "הושלם"}
                    {it.status === "error" && (
                      <span className="text-red-600">
                        שגיאה {it.error ? `– ${it.error}` : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
