// app/api/orders/client/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";
import { validateClientOrderAccess } from "@/lib/api/validate-client-order-access";

async function handler(
  _req: NextRequest,
  context: { phone: string; orderId: number }
) {
  const { orderId, phone } = context;

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
    WHERE o.id = $1 AND o.is_visible = true AND c.phone = $2`,
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

  const items = itemsResult.rows.map((item) => {
    const quantity = item.quantity;
    const unitPrice = Number(item.unit_price);
    const saleQuantity = item.sale_quantity;
    const salePrice = item.sale_price !== null ? Number(item.sale_price) : null;

    let total = unitPrice * quantity;
    if (
      saleQuantity !== null &&
      salePrice !== null &&
      quantity >= saleQuantity
    ) {
      const bundles = Math.floor(quantity / saleQuantity);
      const rest = quantity % saleQuantity;
      total = bundles * salePrice + rest * unitPrice;
    }

    return {
      ...item,
      unit_price: unitPrice,
      sale_price: salePrice,
      total,
    };
  });

  const finalTotal = items.reduce((sum, item) => sum + item.total, 0);

  return NextResponse.json({
    order,
    items,
    finalTotal,
  });
}

export const GET = withMiddleware(handler, {
  middleware: validateClientOrderAccess,
});
