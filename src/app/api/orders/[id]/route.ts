import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db.neon";

// DB types based on schema
type OrderRow = {
  orderId: number;
  phone: string;
  createdAt: string;
  updatedAt: string;
  isPaid: boolean;
  isDelivered: boolean;
};

type OrderItemRow = {
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  saleQuantity: number | null;
  salePrice: number | null;
  productImage: string;
  createdAt: string;
  updatedAt: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    // Get the order
    const orderResult = await pool.query<OrderRow>(
      `SELECT 
         id AS "orderId", 
         phone, 
         created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt", 
         updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt",
         is_paid AS "isPaid",
         is_delivered AS "isDelivered"
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    const order = orderResult.rows[0];
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get the items
    const itemsResult = await pool.query<OrderItemRow>(
      `SELECT
         product_id     AS "productId",
         product_name   AS "productName",
         quantity,
         unit_price     AS "unitPrice",
         sale_quantity  AS "saleQuantity",
         sale_price     AS "salePrice",
         product_image  AS "productImage",
         created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
         updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt"
       FROM order_items
       WHERE order_id = $1`,
      [orderId]
    );

    return NextResponse.json({ order, items: itemsResult.rows });
  } catch (err: unknown) {
    console.error("Error fetching order:", err);
    const error = err instanceof Error ? err.message : "Failed to fetch order";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const body = await req.json();
  const { isPaid, isDelivered } = body;

  try {
    const result = await pool.query(
      `UPDATE orders
       SET is_paid = COALESCE($1, is_paid),
           is_delivered = COALESCE($2, is_delivered)
       WHERE id = $3
       RETURNING is_paid AS "isPaid", is_delivered AS "isDelivered"`,
      [isPaid, isDelivered, orderId]
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating status:", err);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
