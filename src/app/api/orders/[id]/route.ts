import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    const [[order]]: any = await connection.query(
      "SELECT id AS orderId, phone, created_at AS createdAt FROM orders WHERE id = ?",
      [orderId]
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const [items]: any = await connection.query(
      `SELECT
         product_id AS productId,
         product_name AS productName,
         quantity,
         unit_price AS unitPrice,
         sale_quantity AS saleQuantity,
         sale_price AS salePrice
       FROM order_items
       WHERE order_id = ?`,
      [orderId]
    );

    return NextResponse.json({ order, items });
  } catch (err: any) {
    console.error("Error fetching order:", err);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
