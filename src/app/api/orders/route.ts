import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

// === POST /api/orders – Create new order (protected) ===
async function createOrder(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { phone, items, isNotified = false } = body;

    if (!phone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

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

    // ✅ Get valid product IDs
    const productIds = items.map((i) => i.productId);
    const { rows: validRows } = await client.query<{ id: number }>(
      `SELECT id FROM products WHERE id = ANY($1::int[])`,
      [productIds]
    );
    const validIds = new Set(validRows.map((r) => r.id));

    // ❌ If none are valid, abort
    if (validIds.size === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "None of the products in your cart are available anymore." },
        { status: 400 }
      );
    }

    const orderResult = await client.query<{ id: number }>(
      `INSERT INTO orders (client_id, is_notified) VALUES ($1, $2) RETURNING id`,
      [clientId, isNotified]
    );
    const orderId = orderResult.rows[0].id;

    let missingCount = 0;

    for (const item of items) {
      if (!validIds.has(item.productId)) {
        missingCount++;
        continue;
      }

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

    if (missingCount > 0) {
      return NextResponse.json(
        {
          orderId,
          warning: `${missingCount} item(s) were not available and skipped.`,
        },
        { status: 200 }
      );
    }

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


// === GET /api/orders – List visible orders (public) ===
async function listOrders(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const values: any[] = [];
    let whereClause = `WHERE o.is_visible = true`;

    if (from && to) {
      const fromUTC = new Date(`${from}T00:00:00+03:00`).toISOString();
      const toUTC = new Date(`${to}T00:00:00+03:00`);
      toUTC.setDate(toUTC.getDate() + 1);
      const toUTCString = toUTC.toISOString();

      whereClause += ` AND o.created_at >= $1 AND o.created_at < $2`;
      values.push(fromUTC, toUTCString);
    }

    const result = await pool.query(
      `
      SELECT
        o.id AS "orderId",
        o.is_paid AS "isPaid",
        o.is_ready AS "isReady",
        o.is_test AS "isTest",
        o.is_notified AS "isNotified",
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

// ✅ Apply withMiddleware – protectAPI is automatic inside
export const GET = withMiddleware(listOrders);
export const POST = withMiddleware(createOrder, { skipAuth: true });
