import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = cookies();
  const phone = (await cookie).get("phoneNumber")?.value;
  const jwtToken = (await cookie).get("token")?.value;
  const orderId = Number(params.id);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  let isAdmin = false;

  if (jwtToken) {
    try {
      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET!);
      if (
        typeof decoded === "object" &&
        ("role" in decoded ? decoded.role === "admin" : decoded.id === "admin")
      ) {
        isAdmin = true;
      }
    } catch {
      // Invalid token → fallback to phone
    }
  }

  const query = `
    SELECT 
      o.id AS "orderId",
      o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
      o.is_paid AS "isPaid",
      o.is_ready AS "isReady",
      c.name AS "clientName",
      c.address AS "clientAddress",
      c.phone AS "clientPhone"
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.id = $1 AND o.is_visible = true
    ${isAdmin ? "" : "AND c.phone = $2"}
  `;

  const paramsList = isAdmin ? [orderId] : [orderId, phone];
  const orderResult = await pool.query(query, paramsList);

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
    const salePrice = item.sale_price ? Number(item.sale_price) : null;

    let total = unitPrice * quantity;

    if (saleQuantity && salePrice !== null && quantity >= saleQuantity) {
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
