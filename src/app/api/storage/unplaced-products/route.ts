import { NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function listUnplaced() {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.image,
              p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
              p.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
       FROM products p
       LEFT JOIN product_storage ps ON ps.product_id = p.id
       WHERE ps.product_id IS NULL
       ORDER BY p.name ASC`
    );

    return NextResponse.json({ unplaced: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMiddleware(listUnplaced);
