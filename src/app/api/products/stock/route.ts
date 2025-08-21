import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { z } from "zod";
import db from "@/lib/db";

/* ─── POST: Get stock status for multiple products ─── */
async function getProductStock(req: NextRequest) {
  const { ids } = await req.json();

  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
    return NextResponse.json(
      { error: "Invalid or missing product IDs" },
      { status: 400 }
    );
  }

  const result = await db.query(
    `SELECT id, in_stock FROM products WHERE id = ANY($1::int[])`,
    [ids]
  );

  const stockMap: Record<number, boolean> = {};
  for (const row of result.rows) {
    stockMap[row.id] = row.in_stock;
  }

  return NextResponse.json(stockMap);
}

/* ─── PATCH: Update stock status for a single product ─── */
async function updateProductStock(req: NextRequest) {
  const body = await req.json();

  const schema = z.object({
    productId: z.number().int(),
    inStock: z.boolean(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { productId, inStock } = parsed.data;

  try {
    const result = await db.query(
      `UPDATE products SET in_stock = $1, updated_at = now() WHERE id = $2 RETURNING id, in_stock`,
      [inStock, productId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ id: productId, inStock });
  } catch (err) {
    console.error("❌ Stock update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const POST = withMiddleware(getProductStock, { skipAuth: true });
export const PATCH = withMiddleware(updateProductStock);
