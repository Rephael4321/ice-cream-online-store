// lib/image-migration.ts
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";

/** One ledger row, keyed by DB path ("images/..."). */
export type MigItem = {
  /** Canonical DB path (no leading slash), e.g. "images/sales/3/קראנץ' וניל.jpg" */
  db_path: string;

  /** What the DB currently points to (we flip this only on your command). */
  current_source: "vercel" | "s3";

  /** Vercel URL-path (with leading slash), e.g. "/images/…". */
  vercel_path: string;

  /** Content hash of the Vercel file (SHA-256 hex). */
  sha256_vercel?: string | null;

  /** If we know the S3 object by matching the hash in your index, store it here. */
  s3_key?: string | null; // "images/…"
  s3_url?: string | null; // fully qualified, encoded
  size_s3?: number | null; // from your index

  /** If you also want to store S3-side hash explicitly (optional). */
  sha256_s3?: string | null;

  /** True when sha256_vercel equals the S3 object identified by your index. */
  hash_match?: boolean;

  /** Where this db_path appears. */
  tables?: string[];
  count_by_table?: Record<string, number>;

  /** Flip bookkeeping. */
  last_flip_at?: string | null;
  history?: Array<{
    at: string;
    action: "flip_to_s3" | "flip_to_vercel";
    note?: string;
  }>;
};

export type MigManifest = {
  version: number;
  updated_at?: string;
  /** items keyed by db_path ("images/...") */
  items: Record<string, MigItem>;
};

// --- Environment ---

const MEDIA_BUCKET = process.env.MEDIA_BUCKET!;
const REGION = process.env.AWS_REGION!;
const CDN_BASE = (
  process.env.CDN_BASE || `https://${MEDIA_BUCKET}.s3.amazonaws.com`
).replace(/\/+$/, "");

// Base URL of your site that serves the Vercel/public files.
// Use NEXT_PUBLIC_SITE_URL in prod; fallback to SITE_URL if you prefer.
const VERCEL_BASE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  ""
).replace(/\/+$/, "");

// Where the migration manifest (JSON) lives.
// Prefer S3 in prod so it survives restarts; fallback to local file in dev.
const MAN_BUCKET = process.env.IMAGE_MIGRATION_JSON_BUCKET;
const MAN_KEY = process.env.IMAGE_MIGRATION_JSON_KEY;
const LOCAL_MAN =
  process.env.IMAGE_MIGRATION_JSON_PATH ||
  path.join(process.cwd(), "data", "image-migration.json");

// --- Helpers ---

function encSegs(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

/** Normalize a DB value to "images/..." (no leading slash). */
export function toKey(v: string) {
  return v.trim().replace(/^\/?/, "");
}

/** Ensure leading slash for Vercel/public path. */
export function toVercelPath(key: string) {
  return key.startsWith("/") ? key : `/${key}`;
}

/** Build a fully-qualified S3/CDN URL (encoded). */
export function toS3Url(key: string) {
  return `${CDN_BASE}/${encSegs(key)}`;
}

/** Build the absolute URL for the Vercel-served file from a db_path. */
export function vercelUrlFor(dbPath: string) {
  if (!VERCEL_BASE) {
    throw new Error(
      "VERCEL_BASE not configured. Set NEXT_PUBLIC_SITE_URL (or SITE_URL)."
    );
  }
  const key = toKey(dbPath); // "images/..."
  return `${VERCEL_BASE}/${encSegs(key)}`;
}

// --- Manifest I/O ---

export async function loadManifest(): Promise<MigManifest> {
  if (MAN_BUCKET && MAN_KEY) {
    const s3 = new S3Client({
      region: REGION,
      credentials: await assumeRole(),
    });
    try {
      const r = await s3.send(
        new GetObjectCommand({ Bucket: MAN_BUCKET, Key: MAN_KEY })
      );
      const text = await r.Body!.transformToString();
      return JSON.parse(text);
    } catch {
      return { version: 1, items: {} };
    }
  }
  try {
    return JSON.parse(await fs.readFile(LOCAL_MAN, "utf8"));
  } catch {
    return { version: 1, items: {} };
  }
}

export async function saveManifest(m: MigManifest) {
  const payload = JSON.stringify(
    { ...m, updated_at: new Date().toISOString() },
    null,
    2
  );
  if (MAN_BUCKET && MAN_KEY) {
    const s3 = new S3Client({
      region: REGION,
      credentials: await assumeRole(),
    });
    await s3.send(
      new PutObjectCommand({
        Bucket: MAN_BUCKET,
        Key: MAN_KEY,
        Body: payload,
        ContentType: "application/json; charset=utf-8",
      })
    );
    return;
  }
  await fs.mkdir(path.dirname(LOCAL_MAN), { recursive: true });
  await fs.writeFile(LOCAL_MAN, payload, "utf8");
}

// --- S3 listing (presence / inventory) ---

export async function listS3Keys(prefix = "images/"): Promise<string[]> {
  const s3 = new S3Client({ region: REGION, credentials: await assumeRole() });
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const r = await s3.send(
      new ListObjectsV2Command({
        Bucket: MEDIA_BUCKET,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: token,
      })
    );
    for (const o of r.Contents ?? []) {
      const k = o.Key || "";
      if (k && !k.endsWith("/")) keys.push(k);
    }
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

// --- Hashing ---

/** SHA-256 (hex) of a remote resource via streaming fetch. */
export async function sha256OfUrl(url: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok || !res.body)
    throw new Error(`Bad fetch ${res.status} for ${url}`);
  const hash = crypto.createHash("sha256");
  // @ts-ignore: Node ReadableStream
  for await (const chunk of res.body as any) hash.update(chunk);
  return hash.digest("hex");
}

/** Convenience: compute Vercel hash directly from a db_path. */
export async function hashVercel(dbPath: string): Promise<string> {
  const url = vercelUrlFor(dbPath);
  return sha256OfUrl(url);
}

/** Given your index { images: { [hash]: { key, name, size } } }, find S3 record for a hash. */
export function findInIndexByHash(
  indexJson: {
    images?: Record<string, { key: string; name: string; size?: number }>;
  },
  hash: string | null | undefined
): { key: string; size?: number } | null {
  if (!hash) return null;
  const rec = indexJson?.images?.[hash];
  if (!rec?.key) return null;
  return { key: rec.key, size: rec.size };
}

/** Ensure a MigItem has consistent S3 URL fields from a given key. */
export function setS3ForItem(
  item: MigItem,
  s3Key: string | null | undefined,
  size?: number | null
) {
  if (!s3Key) {
    item.s3_key = null;
    item.s3_url = null;
    item.size_s3 = size ?? null;
    return;
  }
  item.s3_key = s3Key;
  item.s3_url = toS3Url(s3Key);
  item.size_s3 = size ?? null;
}
