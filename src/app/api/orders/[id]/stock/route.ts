import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

/* ─── GET (public): return out-of-stock product IDs for given order ─── */
async function getOutOfStock(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId))
    return NextResponse.json({ outOfStock: [] }, { status: 400 });

  const { rows } = await pool.query<{ product_id: number }>(
    `SELECT oi.product_id
       FROM order_items oi
       JOIN products    p ON p.id = oi.product_id
      WHERE oi.order_id = $1 AND p.in_stock = FALSE`,
    [orderId]
  );

  return NextResponse.json({ outOfStock: rows.map((r) => r.product_id) });
}

/* ─── PATCH (admin only): toggle product stock status ─── */
async function updateProductStock(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId))
    return NextResponse.json({ error: "Bad order id" }, { status: 400 });

  const { productId, inStock } = (await req.json()) as {
    productId: number;
    inStock: boolean;
  };

  const { rowCount } = await pool.query(
    `SELECT 1 FROM order_items WHERE order_id = $1 AND product_id = $2`,
    [orderId, productId]
  );
  if (rowCount === 0)
    return NextResponse.json(
      { error: "Product not part of order" },
      { status: 404 }
    );

  await pool.query(`UPDATE products SET in_stock = $1 WHERE id = $2`, [
    inStock,
    productId,
  ]);

  return NextResponse.json({ success: true });
}

// ✅ Export with middleware (GET remains public, PATCH is protected)
export const GET = withMiddleware(getOutOfStock);
export const PATCH = withMiddleware(updateProductStock);
