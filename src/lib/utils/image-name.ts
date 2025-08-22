// src/lib/utils/image-name.ts
export function baseNameFromUrl(url?: string | null): string {
  if (!url) return "";
  const clean = url.split(/[?#]/)[0];
  const last = clean.split("/").pop() ?? "";
  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {}
  const dot = decoded.lastIndexOf(".");
  return dot === -1 ? decoded : decoded.slice(0, dot);
}

export function shortName(name: string, max = 32): string {
  if (!name) return "";
  if (name.length <= max) return name;
  const keep = Math.max(6, Math.floor((max - 3) / 2));
  return `${name.slice(0, keep)}...${name.slice(-keep)}`;
}
