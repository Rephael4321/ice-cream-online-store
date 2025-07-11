import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { phone, items } = body;

    if (!phone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // 1. Check if client exists
    const existingClient = await client.query<{ id: number }>(
      `SELECT id FROM clients WHERE phone = $1`,
      [phone]
    );

    let clientId: number;
    if (existingClient.rows.length > 0) {
      clientId = existingClient.rows[0].id;
    } else {
      const insertClient = await client.query<{ id: number }>(
        `INSERT INTO clients (phone) VALUES ($1) RETURNING id`,
        [phone]
      );
      clientId = insertClient.rows[0].id;
    }

    // 2. Create order with client_id
    const orderResult = await client.query<{ id: number }>(
      `INSERT INTO orders (client_id) VALUES ($1) RETURNING id`,
      [clientId]
    );
    const orderId = orderResult.rows[0].id;

    // 3. Insert order items
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
      const fromUTC = new Date(`${from}T00:00:00+03:00`).toISOString();
      const toUTC = new Date(`${to}T00:00:00+03:00`);
      toUTC.setDate(toUTC.getDate() + 1);
      const toUTCString = toUTC.toISOString();

      whereClause = `WHERE o.created_at >= $1 AND o.created_at < $2`;
      values.push(fromUTC, toUTCString);
    }

    const result = await pool.query(
      `
      SELECT
        o.id AS "orderId",
        o.is_paid AS "isPaid",
        o.is_ready AS "isReady",
        o.is_test AS "isTest",
        o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
        o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt",
        COUNT(oi.id) AS "itemCount",
        c.name AS "clientName",
        c.address AS "clientAddress",
        c.phone AS "clientPhone"
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN clients c ON c.id = o.client_id
      ${whereClause}
      GROUP BY o.id, c.id
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
