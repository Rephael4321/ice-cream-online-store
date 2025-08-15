"use client";

import { useRef, useState } from "react";

type Item = {
  file: File;
  key: string; // images/.../.../name.ext
  hash?: string;
  status:
    | "idle"
    | "hashing"
    | "signing"
    | "uploading"
    | "done"
    | "duplicate"
    | "skipped"
    | "error";
  progress: number; // 0..100 (best effort)
  error?: string;
};

// ---- helpers ----

// Accept common image types; if a browser leaves type empty, check extension
function isImageFile(f: File) {
  if (f.type && f.type.startsWith("image/")) return true;
  const ext = f.name.split(".").pop()?.toLowerCase() || "";
  return [
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "bmp",
    "avif",
    "tiff",
    "svg",
  ].includes(ext);
}

// Hash a file (SHA-256) using Web Crypto
async function hashFileSHA256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hashBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Build an S3 key under images/, preserving the folder structure from the picker
function toImagesKey(file: File): string {
  const rel = (file as any).webkitRelativePath || file.name; // e.g. MyFolder/sub/a.png
  const raw = String(rel).replace(/\\/g, "/").replace(/^\/+/, "");
  const cleaned = raw
    .split("/")
    .map((seg) => (seg && seg !== "." && seg !== ".." ? seg.trim() : ""))
    .filter(Boolean)
    .join("/");
  const collapsed = cleaned.replace(/\/{2,}/g, "/");
  return collapsed.startsWith("images/") ? collapsed : `images/${collapsed}`;
}

export default function UploadFolder({ onUpload }: { onUpload: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{
    uploaded: number;
    duplicates: number;
    failed: number;
  } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const pickFolder = () => inputRef.current?.click();

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files ?? []).filter(isImageFile);
    if (!files.length) return;

    // Initialize items with normalized keys
    const mapped: Item[] = files.map((file) => ({
      file,
      key: toImagesKey(file),
      status: "idle",
      progress: 0,
    }));
    setItems(mapped);
    setSummary(null);
    setGlobalError(null);
  };

  const uploadAll = async () => {
    if (!items.length) return;
    setBusy(true);
    setSummary(null);
    setGlobalError(null);

    // 1) Hash all files and do local dedupe (same content in selected folder)
    const next = [...items];
    const hashToIndex = new Map<string, number>(); // first index per hash
    const toProcess: number[] = []; // indices that will proceed to server check

    for (let i = 0; i < next.length; i++) {
      const it = next[i];
      try {
        it.status = "hashing";
        setItems([...next]);

        const h = await hashFileSHA256(it.file);
        it.hash = h;

        if (hashToIndex.has(h)) {
          // already saw this content in selection → skip locally
          it.status = "skipped";
          it.progress = 100;
        } else {
          hashToIndex.set(h, i);
          it.status = "signing"; // next phase
          toProcess.push(i);
        }
        setItems([...next]);
      } catch (err: any) {
        it.status = "error";
        it.error = err?.message || "hash failed";
        setItems([...next]);
      }
    }

    // 2) For each unique-by-hash file: ask server for duplicate verdict or signed URL
    const newIndexEntries: Array<{
      hash: string;
      key: string;
      name?: string;
      size?: number;
    }> = [];
    let uploaded = 0;
    let duplicates = 0;
    let failed = 0;

    for (const i of toProcess) {
      const it = next[i];
      if (!it.hash) continue; // hashing failed earlier

      try {
        const res = await fetch("/api/images/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: it.key,
            contentType: it.file.type || "application/octet-stream",
            hash: it.hash,
          }),
        });
        if (!res.ok) {
          const msg =
            (await res.json().catch(() => ({})))?.error || "signing failed";
          throw new Error(msg);
        }
        const data = await res.json();

        if (data.duplicate) {
          it.status = "duplicate";
          it.progress = 100;
          duplicates++;
          setItems([...next]);
          continue;
        }

        // 3) Upload to S3
        it.status = "uploading";
        setItems([...next]);
        const put = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": it.file.type || "application/octet-stream",
          },
          body: it.file,
        });
        if (!put.ok) throw new Error(`upload failed (${put.status})`);

        it.status = "done";
        it.progress = 100;
        uploaded++;
        newIndexEntries.push({
          hash: it.hash,
          key: data.key,
          name: it.file.name,
          size: it.file.size,
        });
        setItems([...next]);
      } catch (err: any) {
        it.status = "error";
        it.error = err?.message || "upload error";
        failed++;
        setItems([...next]);
      }
    }

    // 4) Batch update index with only the newly uploaded files
    if (newIndexEntries.length > 0) {
      try {
        await fetch("/api/images/update-index", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: newIndexEntries }),
        });
      } catch {
        // It's okay if this fails; you can reconcile later
        setGlobalError(
          "עדכון האינדקס נכשל עבור חלק מהקבצים שהועלו. ניתן להריץ תיקון מאוחר יותר."
        );
      }
    }

    setBusy(false);
    setSummary({ uploaded, duplicates, failed });

    // Auto-refresh grid if everything succeeded (no failures)
    if (failed === 0) onUpload();
  };

  const total = items.length;
  const done = items.filter(
    (x) =>
      x.status === "done" || x.status === "duplicate" || x.status === "skipped"
  ).length;
  const errs = items.filter((x) => x.status === "error").length;

  return (
    <div dir="rtl" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          // @ts-ignore – directory selection
          webkitdirectory="true"
          // @ts-ignore
          directory="true"
          multiple
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
        <button
          type="button"
          onClick={pickFolder}
          disabled={busy}
          className="bg-gray-700 hover:bg-gray-800 text-white text-sm px-3 py-2 rounded"
        >
          בחר תיקייה
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
              ? `בוצעו ${done}/${total} | שגיאות: ${errs}`
              : `בוצעו ${done}/${total}`}
          </span>
        )}
      </div>

      {summary && (
        <div className="text-xs text-gray-700">
          הועלו: {summary.uploaded} • כפולים (שרת): {summary.duplicates} • כשלו:{" "}
          {summary.failed}
        </div>
      )}
      {globalError && <div className="text-xs text-red-600">{globalError}</div>}

      {items.length > 0 && (
        <div className="max-h-64 overflow-auto rounded border">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-right p-2 font-medium">קובץ</th>
                <th className="text-right p-2 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2 truncate w-[500px]" title={it.key}>
                    {it.key.replace(/^images\//, "")}
                  </td>
                  <td className="p-2">
                    {it.status === "idle" && "מוכן"}
                    {it.status === "hashing" && "מחשב גיבוב…"}
                    {it.status === "signing" && "בודק כפילויות…"}
                    {it.status === "uploading" && "מעלה…"}
                    {it.status === "done" && "הועלה"}
                    {it.status === "duplicate" && "↩️ כפול (כבר קיים בשרת)"}
                    {it.status === "skipped" && "⏭️ דילוג (כפול בתיקייה)"}
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
