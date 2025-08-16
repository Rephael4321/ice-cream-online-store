// src/app/api/img-proxy/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

/**
 * Force Node runtime (we use Buffer, crypto, etc.)
 * and always execute dynamically (never pre-render).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------ Tunables ------------------------------ */
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per image cap
const GET_TIMEOUT_MS = 15000; // abort origin fetch after 8s
const S_MAXAGE = 60 * 60 * 24; // edge cache 1 day
const STALE_WHILE_REVALIDATE = 60 * 60 * 24 * 7; // 7 days
const CACHE_BUDGET_BYTES = 100 * 1024 * 1024; // ~100 MB RAM per instance

// Comma-separated env: ALLOWED_IMAGE_HOSTS=ice-cream-online-store.s3.amazonaws.com,cdn.example.com
const allowedHosts = new Set(
  (process.env.ALLOWED_IMAGE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
);

/* --------------------------- Tiny Byte-LRU ---------------------------- */
type Cached = { buf: Buffer; type: string; etag: string; size: number };

class ByteLRU {
  private map = new Map<string, Cached>(); // insertion order = LRU
  private used = 0;
  constructor(private maxBytes: number) {}

  get(key: string) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    // bump recency
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  set(key: string, val: Cached) {
    const old = this.map.get(key);
    if (old) {
      this.used -= old.size;
      this.map.delete(key);
    }
    while (this.used + val.size > this.maxBytes && this.map.size) {
      const [oldKey, oldVal] = this.map.entries().next().value as [
        string,
        Cached
      ];
      this.map.delete(oldKey);
      this.used -= oldVal.size;
    }
    this.map.set(key, val);
    this.used += val.size;
  }
}

const cache = new ByteLRU(CACHE_BUDGET_BYTES);

/* ---------------------- Coalescing in-flight fetches ---------------------- */
const inflight = new Map<string, Promise<Cached>>();

/* ------------------------------- Helpers ---------------------------------- */
function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function contentTypeFromUrl(u: string): string {
  const p = u.split("?")[0].toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".avif")) return "image/avif";
  if (p.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

function abortableFetch(url: string, ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function isAllowedUrl(u: URL) {
  const isHttp = u.protocol === "http:" || u.protocol === "https:";
  return isHttp && allowedHosts.has(u.hostname);
}

/** Zero-copy view: Node Buffer -> Uint8Array (valid BodyInit) */
function toBody(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  ) as ArrayBuffer;
}

/* ------------------------------- Core fetch ------------------------------- */
async function fetchIntoBuffer(url: string): Promise<Cached> {
  const res = await abortableFetch(url, GET_TIMEOUT_MS);
  if (!res.ok || !res.body) {
    throw new Error(`origin ${res.status}`);
  }

  // Stream into buffer with hard size cap
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error("too_large");
      chunks.push(value);
    }
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  const type = res.headers.get("content-type") ?? contentTypeFromUrl(url);
  const etag = `"${sha256(buf)}"`;

  return { buf, type, etag, size: buf.byteLength };
}

/* ---------------------------------- GET ----------------------------------- */
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("url");
  if (!src) return badRequest("missing url");

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return badRequest("invalid url");
  }

  // SSRF guard (host allow-list)
  if (!isAllowedUrl(target)) return badRequest("forbidden origin", 403);

  const key = target.toString();

  // Cache HIT
  const hit = cache.get(key);
  if (hit) {
    return new NextResponse(toBody(hit.buf), {
      headers: {
        "Content-Type": hit.type,
        ETag: hit.etag,
        "Cache-Control": "public, max-age=0",
        "CDN-Cache-Control": `public, s-maxage=${S_MAXAGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        "X-Proxy-Cache": "HIT",
        "X-Proxy-Bytes": String(hit.size),
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  // Coalesce concurrent MISSes
  if (!inflight.has(key)) {
    inflight.set(
      key,
      fetchIntoBuffer(key).finally(() => inflight.delete(key))
    );
  }

  try {
    const item = await inflight.get(key)!;
    cache.set(key, item);

    return new NextResponse(toBody(item.buf), {
      headers: {
        "Content-Type": item.type,
        ETag: item.etag,
        "Cache-Control": "public, max-age=0",
        "CDN-Cache-Control": `public, s-maxage=${S_MAXAGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        "X-Proxy-Cache": "MISS",
        "X-Proxy-Bytes": String(item.size),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e: any) {
    const msg =
      e?.message === "too_large"
        ? "image too large"
        : e?.message ?? "fetch failed";
    const code = e?.message === "too_large" ? 413 : 502;
    return badRequest(msg, code);
  }
}
