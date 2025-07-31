import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

// === GET /api/products/out-of-stock ===
async function getOutOfStockProducts() {
  try {
    const result = await pool.query(
      `SELECT 
         id,
         name,
         price,
         image,
         created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
         updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
       FROM products
       WHERE in_stock = false
       ORDER BY updated_at DESC`
    );

    return NextResponse.json(result.rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// === PATCH /api/products/out-of-stock ===
async function patchStockStatus(req: NextRequest) {
  try {
    const { productId, inStock } = await req.json();

    if (typeof productId !== "number" || typeof inStock !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await pool.query(
      "UPDATE products SET in_stock = $1, updated_at = NOW() WHERE id = $2",
      [inStock, productId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMiddleware(getOutOfStockProducts);
export const PATCH = withMiddleware(patchStockStatus);
