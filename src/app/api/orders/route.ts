import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db.neon";

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

// GET /api/orders
export async function GET() {
  try {
    const result = await pool.query<OrderSummaryRow>(
      `
      SELECT
        o.id AS "orderId",
        o.phone,
        o.created_at AS "createdAt",
        COUNT(oi.id) AS "itemCount"
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `
    );

    return NextResponse.json({ orders: result.rows });
  } catch (err: unknown) {
    console.error("Error fetching orders:", err);
    const error = err instanceof Error ? err.message : "Failed to fetch orders";
    return NextResponse.json({ error }, { status: 500 });
  }
}
