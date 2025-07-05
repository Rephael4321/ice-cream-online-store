import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db.neon";

// DB types based on schema
type OrderRow = {
  orderId: number;
  phone: string;
  createdAt: string;
  updatedAt: string;
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
         created_at AS "createdAt", 
         updated_at AS "updatedAt"
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
         created_at     AS "createdAt",
         updated_at     AS "updatedAt"
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
