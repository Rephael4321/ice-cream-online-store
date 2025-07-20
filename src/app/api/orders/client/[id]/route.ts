import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = cookies();
  const phone = (await cookie).get("phoneNumber")?.value;
  const orderId = Number(params.id);

  if (!phone || isNaN(orderId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderResult = await pool.query(
    `SELECT 
      o.id AS "orderId",
      o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
      o.is_paid AS "isPaid",
      o.is_ready AS "isReady",
      c.name AS "clientName",
      c.address AS "clientAddress",
      c.phone AS "clientPhone"
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.id = $1 AND c.phone = $2 AND o.is_visible = true`,
    [orderId, phone]
  );

  if (orderResult.rowCount === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderResult.rows[0];

  const itemsResult = await pool.query(
    `SELECT 
      product_name, 
      product_image, 
      quantity, 
      unit_price, 
      sale_quantity, 
      sale_price
    FROM order_items
    WHERE order_id = $1`,
    [orderId]
  );

  return NextResponse.json({
    order,
    items: itemsResult.rows,
  });
}
