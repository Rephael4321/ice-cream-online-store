"use client";

import { useRef, useState } from "react";
import { validateImageFile, MAX_FILE_SIZE } from "./utils/upload-utils";

type Result = {
  name: string;
  size: number;
  type: string;
  hash?: string;
  key?: string;
  status: "uploaded" | "duplicate" | "skipped" | "error";
  message?: string;
};

export default function UploadImage({ onUpload }: { onUpload: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const pick = () => inputRef.current?.click();

  const onPick: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const errs: string[] = [];
    const ok: File[] = [];

    for (const f of selected) {
      const err = validateImageFile(f);
      if (err) errs.push(`${f.name}: ${err}`);
      else ok.push(f);
    }

    setFiles(ok);
    setErrors(errs);
    setResults(null);
  };

  const upload = async () => {
    if (!files.length || busy) return;
    setBusy(true);
    setResults(null);

    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/images/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      setResults(Array.isArray(data?.results) ? data.results : []);
      if (
        Array.isArray(data?.results) &&
        data.results.some((r: Result) => r.status === "uploaded")
      ) {
        onUpload();
      }
    } catch {
      setResults([
        {
          name: "—",
          size: 0,
          type: "",
          status: "error",
          message: "Upload failed",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const summary = (() => {
    const r = results ?? [];
    const up = r.filter((x) => x.status === "uploaded").length;
    const du = r.filter((x) => x.status === "duplicate").length;
    const sk = r.filter((x) => x.status === "skipped").length;
    const er = r.filter((x) => x.status === "error").length;
    return { up, du, sk, er };
  })();

  return (
    <div dir="rtl" className="flex flex-col gap-2 w-full sm:w-auto">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPick}
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={pick}
          disabled={busy}
          className="w-full sm:w-auto bg-white border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
          title="בחר תמונות"
        >
          בחר תמונות
        </button>
        <button
          onClick={upload}
          disabled={!files.length || busy}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm"
        >
          {busy ? "מעלה…" : files.length ? `העלה (${files.length})` : "העלה"}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="text-xs text-red-600 space-y-1">
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {files.length > 0 && !results && (
        <div className="text-xs text-gray-600">
          נבחרו {files.length} קבצים. מגבלת גודל:{" "}
          {(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB לתמונה.
        </div>
      )}

      {results && (
        <div className="rounded-lg border border-gray-200 p-3 max-h-60 overflow-auto text-xs bg-white">
          <div className="flex flex-wrap gap-3 mb-2">
            <span className="px-2 py-0.5 rounded bg-green-50 text-green-700">
              הועלו: {summary.up}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700">
              כפולים: {summary.du}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-700">
              נדחו: {summary.sk}
            </span>
            <span className="px-2 py-0.5 rounded bg-red-50 text-red-700">
              שגיאות: {summary.er}
            </span>
          </div>
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="truncate" title={r.name}>
                  {r.name}
                </span>
                <span className="whitespace-nowrap">
                  {r.status === "uploaded" && "הועלה ✅"}
                  {r.status === "duplicate" && "כפול ♻️"}
                  {r.status === "skipped" && "נדחה"}
                  {r.status === "error" && (
                    <span className="text-red-600">
                      שגיאה {r.message ? `– ${r.message}` : ""}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
