// app/api/migration/images/flip/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { loadManifest, saveManifest, toKey } from "@/lib/image-migration";

export const dynamic = "force-dynamic";

async function updateDb(
  db_path: string,
  to: "vercel" | "s3",
  s3_url?: string | null
) {
  const val = to === "s3" ? String(s3_url) : `/${db_path}`;
  // products
  await pool.query(
    `UPDATE products SET image = $1 WHERE image = $2 OR image = $3`,
    [val, `/${db_path}`, db_path]
  );
  // categories
  await pool.query(
    `UPDATE categories SET image = $1 WHERE image = $2 OR image = $3`,
    [val, `/${db_path}`, db_path]
  );
  // sale_groups
  await pool.query(
    `UPDATE sale_groups SET image = $1 WHERE image = $2 OR image = $3`,
    [val, `/${db_path}`, db_path]
  );
  // order_items
  await pool.query(
    `UPDATE order_items SET product_image = $1 WHERE product_image = $2 OR product_image = $3`,
    [val, `/${db_path}`, db_path]
  );
}

export async function POST(req: NextRequest) {
  try {
    const {
      db_path: raw,
      to,
      force,
    }: {
      db_path: string;
      to: "vercel" | "s3";
      force?: boolean;
    } = await req.json();
    const db_path = toKey(raw);
    const m = await loadManifest();
    const it = m.items[db_path];
    if (!it)
      return NextResponse.json(
        { error: "db_path not found in manifest" },
        { status: 404 }
      );

    if (to === "s3" && !force) {
      if (!it.hash_match || !it.s3_url) {
        return NextResponse.json(
          {
            error:
              "no hash match or missing s3_url; use force:true to override",
          },
          { status: 400 }
        );
      }
    }

    await updateDb(db_path, to, it.s3_url);

    const now = new Date().toISOString();
    it.current_source = to;
    it.last_flip_at = now;
    it.history ||= [];
    it.history.push({
      at: now,
      action: to === "s3" ? "flip_to_s3" : "flip_to_vercel",
    });

    await saveManifest(m);
    return NextResponse.json({ ok: true, item: it });
  } catch (e) {
    console.error("flip error:", e);
    return NextResponse.json({ error: "flip failed" }, { status: 500 });
  }
}
