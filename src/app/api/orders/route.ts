import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

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
  updatedAt: string;
  itemCount: number;
};

// POST /api/orders
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body: OrderInput = await req.json();
    const { phone, items } = body;

    if (!phone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // 1. Insert order
    const orderResult = await client.query<{ id: number }>(
      "INSERT INTO orders (phone) VALUES ($1) RETURNING id",
      [phone]
    );
    const orderId = orderResult.rows[0].id;

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

      await client.query(
        `INSERT INTO order_items
         (order_id, product_id, product_name, product_image, quantity, unit_price, sale_quantity, sale_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
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

    await client.query("COMMIT");
    return NextResponse.json({ orderId });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("Error creating order:", err);
    const error = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const values: any[] = [];
    let whereClause = "";

    if (from && to) {
      // Convert local (Asia/Jerusalem) dates to UTC ranges
      const fromUTC = new Date(`${from}T00:00:00+03:00`).toISOString(); // e.g., 2025-07-01T21:00:00Z
      const toUTC = new Date(`${to}T00:00:00+03:00`);
      toUTC.setDate(toUTC.getDate() + 1);
      const toUTCString = toUTC.toISOString(); // e.g., 2025-07-02T21:00:00Z

      whereClause = `WHERE o.created_at >= $1 AND o.created_at < $2`;
      values.push(fromUTC, toUTCString);
    }

    const result = await pool.query(
      `
      SELECT
        o.id AS "orderId",
        o.phone,
        o.is_paid AS "isPaid",
        o.is_ready AS "isReady",
        o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
        o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt",
        COUNT(oi.id) AS "itemCount"
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `,
      values
    );

    return NextResponse.json({ orders: result.rows });
  } catch (err: unknown) {
    console.error("Error fetching orders:", err);
    const error = err instanceof Error ? err.message : "Failed to fetch orders";
    return NextResponse.json({ error }, { status: 500 });
  }
}
