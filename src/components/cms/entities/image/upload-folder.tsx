"use client";

import { useState, useRef, useEffect } from "react";

type Status =
  | "idle"
  | "hashing"
  | "ready"
  | "duplicate"
  | "uploading"
  | "done"
  | "error";

type Item = {
  file: File;
  key: string;
  hash?: string;
  status: Status;
  error?: string;
};

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

async function hashFileSHA256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hashBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toImagesKey(file: File): string {
  const rel = (file as any).webkitRelativePath || file.name;
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
  const controllersRef = useRef<AbortController[]>([]);
  const cancelRequested = useRef(false);

  const [items, setItems] = useState<Item[]>([]);
  const [serverIndex, setServerIndex] = useState<Set<string>>(new Set());
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{
    uploaded: number;
    duplicates: number;
    failed: number;
  } | null>(null);

  // Load index from API once (fresh, no-cache)
  useEffect(() => {
    async function loadIndex() {
      try {
        const res = await fetch("/api/images/index", {
          cache: "no-store",
          headers: { "Cache-Control": "no-store" },
        });
        if (!res.ok) {
          console.warn(`Index fetch failed: ${res.status}`);
          setServerIndex(new Set());
          return;
        }
        const data = await res.json();
        if (data?.images && typeof data.images === "object") {
          setServerIndex(new Set(Object.keys(data.images)));
        }
      } catch (err) {
        console.warn("No index found or failed to load — treating as empty.");
        setServerIndex(new Set());
      } finally {
        setIndexLoaded(true);
      }
    }
    loadIndex();
  }, []);

  const pickFolder = () => inputRef.current?.click();

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = Array.from(e.target.files ?? []).filter(isImageFile);
    if (!files.length) return;
    setItems(
      files.map((file) => ({ file, key: toImagesKey(file), status: "idle" }))
    );
    setSummary(null);
  };

  const cancelAll = () => {
    cancelRequested.current = true;
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current = [];
    setBusy(false);
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: "idle",
        error: undefined,
      }))
    );
  };

  // Combined: Check duplicates → Upload
  const handleUploadClick = async () => {
    if (!indexLoaded || !items.length) return;
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        status: "idle",
        error: undefined,
      }))
    );
    cancelRequested.current = false;
    setBusy(true);

    const next = [...items];
    let duplicates = 0;

    // Phase 1: Check duplicates
    for (let i = 0; i < next.length; i++) {
      if (cancelRequested.current) break;
      const it = next[i];
      try {
        it.status = "hashing";
        setItems([...next]);
        const hash = await hashFileSHA256(it.file);
        if (cancelRequested.current) break;
        it.hash = hash;
        if (serverIndex.has(hash)) {
          it.status = "duplicate";
          duplicates++;
        } else {
          it.status = "ready";
        }
        setItems([...next]);
      } catch (err: any) {
        it.status = "error";
        it.error = err?.message || "hash failed";
        setItems([...next]);
      }
    }

    // ✅ Immediately clear serverIndex from memory after checking
    setServerIndex(new Set());

    if (cancelRequested.current) {
      setBusy(false);
      return;
    }

    setSummary({ uploaded: 0, duplicates, failed: 0 });

    // Phase 2: Upload non-duplicates
    const readyFiles = next.filter((it) => it.status === "ready");
    let uploaded = 0,
      failed = 0;

    for (const it of readyFiles) {
      if (cancelRequested.current) break;
      try {
        it.status = "uploading";
        setItems([...next]);

        const signController = new AbortController();
        controllersRef.current.push(signController);

        const res = await fetch("/api/images/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: it.key,
            contentType: it.file.type || "application/octet-stream",
            hash: it.hash,
          }),
          signal: signController.signal,
        });

        const data = await res.json();
        if (!res.ok || data.error)
          throw new Error(data.error || "signing failed");

        if (cancelRequested.current) break;

        const uploadController = new AbortController();
        controllersRef.current.push(uploadController);

        const put = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": it.file.type || "application/octet-stream",
          },
          body: it.file,
          signal: uploadController.signal,
        });

        if (!put.ok) throw new Error(`upload failed (${put.status})`);

        it.status = "done";
        uploaded++;
        setItems([...next]);

        await fetch("/api/images/update-index", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entries: [
              {
                key: it.key,
                hash: it.hash!,
                name: it.file.name,
                size: it.file.size,
              },
            ],
          }),
        });
      } catch (err: any) {
        if (cancelRequested.current) break;
        it.status = "error";
        it.error = err?.message || "upload error";
        failed++;
        setItems([...next]);
      }
    }

    setSummary({ uploaded, duplicates, failed });
    setBusy(false);

    if (!cancelRequested.current) {
      onUpload();
    }
  };

  return (
    <div dir="rtl" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          //@ts-ignore
          webkitdirectory="true"
          //@ts-ignore
          directory="true"
          multiple
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
        <button
          onClick={pickFolder}
          disabled={busy}
          className="bg-gray-700 hover:bg-gray-800 text-white text-sm px-3 py-2 rounded"
        >
          בחר תיקייה
        </button>
        <button
          onClick={handleUploadClick}
          disabled={busy || !items.length}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded"
        >
          העלה (בדיקה+העלאה)
        </button>
        {busy && (
          <button
            onClick={cancelAll}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded"
          >
            בטל
          </button>
        )}
      </div>

      {summary && (
        <div className="text-xs text-gray-700">
          הועלו: {summary.uploaded} • כפולים: {summary.duplicates} • כשלו:{" "}
          {summary.failed}
        </div>
      )}

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
                    {it.status === "ready" && "✅ מוכן להעלאה"}
                    {it.status === "duplicate" && "↩️ כפול (בשרת)"}
                    {it.status === "uploading" && "מעלה…"}
                    {it.status === "done" && "הועלה"}
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
