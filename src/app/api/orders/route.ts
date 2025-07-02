import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket, OkPacket } from "mysql2";

// Order payload types
type OrderItemInput = {
  productId: number | null;
  productName: string;
  productImage?: string | null;
  quantity: number;
  unitPrice: number;
  saleQuantity?: number | null;
  salePrice?: number | null;
};

type OrderInput = {
  phone: string;
  items: OrderItemInput[];
};

type OrderSummaryRow = {
  orderId: number;
  phone: string;
  createdAt: string;
  itemCount: number;
};

// POST /api/orders
export async function POST(req: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const body: OrderInput = await req.json();
    const { phone, items } = body;

    if (!phone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // 1. Insert order
    const [orderResult] = await connection.query<OkPacket>(
      "INSERT INTO orders (phone) VALUES (?)",
      [phone]
    );
    const orderId = orderResult.insertId;

    // 2. Insert order items
    for (const item of items) {
      const {
        productId,
        productName,
        productImage = null,
        quantity,
        unitPrice,
        saleQuantity = null,
        salePrice = null,
      } = item;

      await connection.query<OkPacket>(
        `INSERT INTO order_items
         (order_id, product_id, product_name, product_image, quantity, unit_price, sale_quantity, sale_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          productId,
          productName,
          productImage,
          quantity,
          unitPrice,
          saleQuantity,
          salePrice,
        ]
      );
    }

    await connection.commit();
    return NextResponse.json({ orderId });
  } catch (err: unknown) {
    await connection.rollback();
    console.error("Error creating order:", err);
    const error = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error }, { status: 500 });
  } finally {
    connection.release();
  }
}

// GET /api/orders
export async function GET() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<OrderSummaryRow[] & RowDataPacket[]>(
      `
      SELECT
        o.id AS orderId,
        o.phone,
        o.created_at AS createdAt,
        COUNT(oi.id) AS itemCount
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `
    );

    return NextResponse.json({ orders: rows });
  } catch (err: unknown) {
    console.error("Error fetching orders:", err);
    const error = err instanceof Error ? err.message : "Failed to fetch orders";
    return NextResponse.json({ error }, { status: 500 });
  } finally {
    connection.release();
  }
}
