import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

type OrderRow = {
  orderId: number;
  clientPhone: string;
  clientName: string;
  clientAddress: string;
  createdAt: string;
  updatedAt: string;
  isPaid: boolean;
  isReady: boolean;
  isTest: boolean;
  isNotified: boolean;
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

// === GET /api/orders/[id] (public view) ===
async function getOrder(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId)) {
    console.warn("❌ Invalid order ID:", params.id);
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    const orderResult = await pool.query<OrderRow>(
      `SELECT 
         o.id AS "orderId",
         c.phone AS "clientPhone",
         c.name AS "clientName",
         c.address AS "clientAddress",
         o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
         o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt",
         o.is_paid AS "isPaid",
         o.is_ready AS "isReady",
         o.is_test AS "isTest",
         o.is_notified AS "isNotified"
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       WHERE o.id = $1`,
      [orderId]
    );

    const order = orderResult.rows[0];
    if (!order) {
      console.warn("❌ Order not found or is not visible");
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

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

    return NextResponse.json({
      order,
      items: itemsResult.rows,
    });
  } catch (err: unknown) {
    console.error("❌ Error fetching order:", err);
    const error = err instanceof Error ? err.message : "Failed to fetch order";
    return NextResponse.json({ error }, { status: 500 });
  }
}

// === PATCH /api/orders/[id] (admin only) ===
async function updateOrder(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const body = await req.json();
  const { isPaid, isReady, isTest, name, address } = body;

  try {
    if (typeof isTest === "boolean") {
      const testResult = await pool.query(
        `UPDATE orders SET is_test = $1 WHERE id = $2 RETURNING is_test AS "isTest"`,
        [isTest, orderId]
      );

      return NextResponse.json({
        isTest: testResult.rows[0]?.isTest ?? false,
      });
    }

    const orderResult = await pool.query(
      `UPDATE orders
       SET is_paid = COALESCE($1, is_paid),
           is_ready = COALESCE($2, is_ready)
       WHERE id = $3
       RETURNING id, client_id, is_paid AS "isPaid", is_ready AS "isReady"`,
      [isPaid, isReady, orderId]
    );

    if (orderResult.rowCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const {
      client_id,
      isPaid: updatedIsPaid,
      isReady: updatedIsReady,
    } = orderResult.rows[0];

    if ("name" in body || "address" in body) {
      await pool.query(
        `UPDATE clients
         SET name = $1,
         address = $2
        WHERE id = $3`,
        [name, address, client_id]
      );
    }

    const clientResult = await pool.query(
      `SELECT name, address, phone FROM clients WHERE id = $1`,
      [client_id]
    );

    return NextResponse.json({
      isPaid: updatedIsPaid,
      isReady: updatedIsReady,
      name: clientResult.rows[0].name,
      address: clientResult.rows[0].address,
      phone: clientResult.rows[0].phone,
    });
  } catch (err) {
    console.error("Error updating order:", err);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

// === DELETE /api/orders/[id] (admin only) ===
async function deleteOrder(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    await pool.query(`UPDATE orders SET is_visible = false WHERE id = $1`, [
      orderId,
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error soft-deleting order:", err);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}

// === Export handlers with middleware ===
export const GET = withMiddleware(getOrder); // Public
export const PATCH = withMiddleware(updateOrder); // Admin only
export const DELETE = withMiddleware(deleteOrder); // Admin only
