/* ────────────────────────────────────────────────
   src/app/api/orders/[id]/stock/route.ts
   ──────────────────────────────────────────────── */
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

/* ---------- GET  : list productIds that are OUT of stock ---------- */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId))
    return NextResponse.json({ outOfStock: [] }, { status: 400 });

  /* products table owns the in_stock flag */
  const { rows } = await pool.query<{ product_id: number }>(
    `SELECT   oi.product_id
       FROM   order_items  oi
       JOIN   products     p  ON p.id = oi.product_id
      WHERE   oi.order_id        = $1
        AND   p.in_stock         = FALSE`,
    [orderId]
  );

  return NextResponse.json({ outOfStock: rows.map((r) => r.product_id) });
}

/* ---------- PATCH : toggle in_stock on products ---------- */
export async function PATCH(
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

  /* verify the product really belongs to this order */
  const { rowCount } = await pool.query(
    `SELECT 1 FROM order_items
      WHERE order_id = $1 AND product_id = $2`,
    [orderId, productId]
  );
  if (rowCount === 0)
    return NextResponse.json(
      { error: "Product not part of order" },
      { status: 404 }
    );

  /* toggle the global flag on products table */
  await pool.query(`UPDATE products SET in_stock = $1 WHERE id = $2`, [
    inStock,
    productId,
  ]);

  return NextResponse.json({ success: true });
}
