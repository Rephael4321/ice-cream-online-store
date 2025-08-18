// app/api/migration/images/collect/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import {
  loadManifest,
  saveManifest,
  toKey,
  toS3Url,
  toVercelPath,
  vercelUrlFor,
  sha256OfUrl,
  MigManifest,
  MigItem,
} from "@/lib/image-migration";

// keep using your existing exports from the images-index helper
import { ImagesIndex, INDEX_KEY } from "@/lib/aws/images-index";

// Local loader for the index (no changes to images-index module)
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";

const MEDIA_BUCKET = process.env.MEDIA_BUCKET!;
const AWS_REGION = process.env.AWS_REGION!;

async function loadImagesIndex(): Promise<ImagesIndex> {
  const s3 = new S3Client({
    region: AWS_REGION,
    credentials: await assumeRole(),
  });
  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: INDEX_KEY })
    );
    const text = await obj.Body!.transformToString();
    const json = JSON.parse(text);
    if (
      !json ||
      typeof json !== "object" ||
      typeof json.version !== "number" ||
      typeof json.images !== "object"
    ) {
      return { version: 1, images: {} };
    }
    return json as ImagesIndex;
  } catch {
    return { version: 1, images: {} };
  }
}

export const dynamic = "force-dynamic";

type TablesMap = {
  products: string[];
  categories: string[];
  sale_groups: string[];
  order_items: string[];
};

type SourceHints = Record<string, "vercel" | "s3">;

/** Normalize any DB value to canonical "images/..." and detect if the DB value is an S3/HTTP URL. */
function normalizeValueToDbPath(val: unknown): {
  dbPath: string | null;
  isS3: boolean;
} {
  const raw = String(val ?? "").trim();
  if (!raw) return { dbPath: null, isS3: false };

  // Absolute URL (S3/CDN etc.)
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      let p = u.pathname.replace(/^\/+/, "");
      try {
        p = decodeURIComponent(p);
      } catch {}
      if (p.startsWith("images/")) return { dbPath: p, isS3: true };
      return { dbPath: null, isS3: true }; // URL but not under images/, ignore
    } catch {
      // fall through to relative handling
    }
  }

  // Relative like "/images/..." or "images/..."
  const rel = toKey(raw); // strips leading slash
  if (rel.startsWith("images/")) return { dbPath: rel, isS3: false };
  return { dbPath: null, isS3: false };
}

async function fetchDbPaths(): Promise<{
  tables: TablesMap;
  sourceHints: SourceHints;
}> {
  const tables: TablesMap = {
    products: [],
    categories: [],
    sale_groups: [],
    order_items: [],
  };
  const sourceHints: SourceHints = {};

  // products.image
  {
    const r = await pool.query(
      `SELECT image FROM products WHERE image IS NOT NULL AND image <> ''`
    );
    for (const row of r.rows as Array<{ image: string }>) {
      const { dbPath, isS3 } = normalizeValueToDbPath(row.image);
      if (dbPath) {
        tables.products.push(dbPath);
        sourceHints[dbPath] = isS3 ? "s3" : sourceHints[dbPath] || "vercel";
      }
    }
  }
  // categories.image
  {
    const r = await pool.query(
      `SELECT image FROM categories WHERE image IS NOT NULL AND image <> ''`
    );
    for (const row of r.rows as Array<{ image: string }>) {
      const { dbPath, isS3 } = normalizeValueToDbPath(row.image);
      if (dbPath) {
        tables.categories.push(dbPath);
        sourceHints[dbPath] = isS3 ? "s3" : sourceHints[dbPath] || "vercel";
      }
    }
  }
  // sale_groups.image
  {
    const r = await pool.query(
      `SELECT image FROM sale_groups WHERE image IS NOT NULL AND image <> ''`
    );
    for (const row of r.rows as Array<{ image: string }>) {
      const { dbPath, isS3 } = normalizeValueToDbPath(row.image);
      if (dbPath) {
        tables.sale_groups.push(dbPath);
        sourceHints[dbPath] = isS3 ? "s3" : sourceHints[dbPath] || "vercel";
      }
    }
  }
  // order_items.product_image
  {
    const r = await pool.query(
      `SELECT product_image FROM order_items WHERE product_image IS NOT NULL AND product_image <> ''`
    );
    for (const row of r.rows as Array<{ product_image: string }>) {
      const { dbPath, isS3 } = normalizeValueToDbPath(row.product_image);
      if (dbPath) {
        tables.order_items.push(dbPath);
        sourceHints[dbPath] = isS3 ? "s3" : sourceHints[dbPath] || "vercel";
      }
    }
  }

  return { tables, sourceHints };
}

// tiny concurrency limiter
async function mapLimit<T, R>(
  arr: T[],
  n: number,
  fn: (t: T) => Promise<R>
): Promise<R[]> {
  const res: R[] = new Array(arr.length);
  let i = 0,
    inflight = 0;
  return await new Promise<R[]>((resolve, reject) => {
    const next = () => {
      if (i >= arr.length && inflight === 0) return resolve(res);
      while (inflight < n && i < arr.length) {
        const idx = i++;
        const item = arr[idx];
        inflight++;
        fn(item)
          .then((r) => {
            res[idx] = r;
            inflight--;
            next();
          })
          .catch(reject);
      }
    };
    next();
  });
}

export async function GET(_req: NextRequest) {
  try {
    const [{ tables: db, sourceHints }, manifest, indexJson] =
      await Promise.all([fetchDbPaths(), loadManifest(), loadImagesIndex()]);

    const allDbPaths = Array.from(
      new Set([
        ...db.products,
        ...db.categories,
        ...db.sale_groups,
        ...db.order_items,
      ])
    );

    const m: MigManifest = manifest || { version: 1, items: {} };

    // Ensure manifest entries exist & base fields (and set current_source from DB hints)
    for (const p of allDbPaths) {
      const counts: Record<string, number> = {
        products: db.products.filter((x) => x === p).length,
        categories: db.categories.filter((x) => x === p).length,
        sale_groups: db.sale_groups.filter((x) => x === p).length,
        order_items: db.order_items.filter((x) => x === p).length,
      };
      const tablesList = Object.entries(counts)
        .filter(([, c]) => c > 0)
        .map(([t]) => t);
      const srcFromDb = sourceHints[p] || "vercel";

      if (!m.items[p]) {
        const base: MigItem = {
          db_path: p,
          current_source: srcFromDb, // reflect actual DB
          vercel_path: toVercelPath(p),

          sha256_vercel: null,
          sha256_s3: null,
          hash_match: false,

          s3_key: null,
          s3_url: null,
          size_s3: null,

          tables: tablesList,
          count_by_table: counts,
          last_flip_at: null,
          history: [],
        };
        m.items[p] = base;
      } else {
        m.items[p].vercel_path ||= toVercelPath(p);
        m.items[p].tables = tablesList;
        m.items[p].count_by_table = counts;
        // If DB shows S3, reflect it (don't force back to vercel)
        if (srcFromDb === "s3") m.items[p].current_source = "s3";
      }
    }

    // Hash Vercel for each DB path; then match via the S3 index (hash → key)
    await mapLimit(allDbPaths, 8, async (p) => {
      const it = m.items[p] as MigItem;

      // 1) Vercel hash
      try {
        const url = vercelUrlFor(p);
        const hash = await sha256OfUrl(url);
        it.sha256_vercel = hash;
      } catch {
        it.sha256_vercel = null;
      }

      // 2) match to S3 by hash via index
      const meta = it.sha256_vercel
        ? indexJson.images[it.sha256_vercel]
        : undefined;
      if (meta?.key) {
        it.s3_key = meta.key; // exact S3 key from index (can differ from db_path if deduped)
        it.s3_url = toS3Url(meta.key);
        it.size_s3 = meta.size ?? null;
        it.sha256_s3 = it.sha256_vercel; // index key equals hash
        it.hash_match = true;
      } else {
        it.s3_key = null;
        it.s3_url = null;
        it.size_s3 = null;
        it.sha256_s3 = null;
        it.hash_match = false;
      }
    });

    await saveManifest(m);

    return NextResponse.json({
      manifest: m,
      byTable: db, // still arrays of canonical "images/..." so UI grouping works
      totals: {
        assets_in_db: allDbPaths.length,
        matched_in_s3_by_hash: Object.values(m.items).filter(
          (i) => i.hash_match
        ).length,
      },
    });
  } catch (e) {
    console.error("collect error:", e);
    return NextResponse.json({ error: "collect failed" }, { status: 500 });
  }
}
