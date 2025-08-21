import db from "@/lib/db";

/**
 * Normalize to a plain S3 key "images/..."
 * Accepts either a full URL (https://bucket/images/..)
 * or a raw key ("images/..").
 */
function toKey(v: string | null | undefined): string | null {
  const s = (v || "").trim();
  if (!s) return null;

  if (s.startsWith("images/")) return s;

  try {
    const u = new URL(s);
    const path = u.pathname.replace(/^\/+/, "");
    return path.startsWith("images/") ? path : null;
  } catch {
    // not a URL; best-effort
    return s.includes("/") ? s : null;
  }
}

/** Collect keys from tables that reference images. Add more sources if needed. */
export async function listUsedImageKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  const client = await db.connect();
  try {
    // products.image
    const pr = await client.query<{ image: string | null }>(
      `SELECT image FROM products WHERE image IS NOT NULL AND image <> ''`
    );
    for (const row of pr.rows) {
      const k = toKey(row.image);
      if (k) keys.add(k);
    }

    // categories.image (if applicable)
    try {
      const cr = await client.query<{ image: string | null }>(
        `SELECT image FROM categories WHERE image IS NOT NULL AND image <> ''`
      );
      for (const row of cr.rows) {
        const k = toKey(row.image);
        if (k) keys.add(k);
      }
    } catch {
      // table may not exist; ignore
    }

    // sale_groups.image (if applicable)
    try {
      const sg = await client.query<{ image: string | null }>(
        `SELECT image FROM sale_groups WHERE image IS NOT NULL AND image <> ''`
      );
      for (const row of sg.rows) {
        const k = toKey(row.image);
        if (k) keys.add(k);
      }
    } catch {
      // optional
    }

    return keys;
  } finally {
    client.release();
  }
}
