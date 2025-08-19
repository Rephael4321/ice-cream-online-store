export type Status =
  | "idle"
  | "hashing"
  | "ready"
  | "duplicate"
  | "uploading"
  | "done"
  | "error";

export type Item = {
  file: File;
  key: string;
  hash?: string;
  status: Status;
  error?: string;
};

const ALLOWED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "avif",
  "tiff",
  "svg",
];

// ✅ Max file size aligned with server (10 MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateImageFile(f: File): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() || "";
  if (!(f.type?.startsWith("image/") || ALLOWED_EXTENSIONS.includes(ext))) {
    return "סוג קובץ לא נתמך";
  }
  if (f.size > MAX_FILE_SIZE) {
    return `הקובץ גדול מדי (${(f.size / 1024 / 1024).toFixed(
      1
    )}MB). מגבלת גודל: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`;
  }
  return null;
}

export async function hashFileSHA256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hashBuf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function toImagesKey(file: File): string {
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
