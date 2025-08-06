import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function assignStorage(req: NextRequest) {
  try {
    const { product_id, storage_area_id } = await req.json();

    if (!product_id) {
      return NextResponse.json(
        { error: "Missing product_id" },
        { status: 400 }
      );
    }

    if (storage_area_id === null || typeof storage_area_id === "undefined") {
      // ❌ No storage selected → remove assignment
      await pool.query(`DELETE FROM product_storage WHERE product_id = $1`, [
        product_id,
      ]);
      return NextResponse.json({ removed: true });
    }

    // ✅ Assign or update storage area
    const result = await pool.query(
      `INSERT INTO product_storage (product_id, storage_area_id, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (product_id) DO UPDATE
       SET storage_area_id = EXCLUDED.storage_area_id,
           updated_at = now()
       RETURNING *`,
      [product_id, storage_area_id]
    );

    return NextResponse.json({ assigned: result.rows[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withMiddleware(assignStorage);
