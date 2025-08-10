import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

type OrderRow = {
  orderId: number;
  clientPhone: string | null;
  clientName: string | null;
  clientAddress: string | null;
  createdAt: string;
  updatedAt: string;
  isPaid: boolean;
  isReady: boolean;
  isTest: boolean;
  isNotified: boolean;
  preGroupTotal: number | null;
  groupDiscountTotal: number;
  total: number | null;
};

type OrderItemRow = {
  productId: number | null;
  productName: string | null;
  quantity: number;
  unitPrice: number | null;
  saleQuantity: number | null;
  salePrice: number | null;
  productImage: string | null;
  inStock: boolean | null;
  createdAt: string;
  updatedAt: string;
  storageName: string | null;
  storageSort: number | null;
  groupId: number | null;
  groupBundleQty: number | null;
  groupSalePrice: number | null;
  groupUnitPrice: number | null;
  groupDiscount: number;
  baseTotal: number | null;
  afterItemSale: number | null;
};

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
         o.is_notified AS "isNotified",
         o.pre_group_total      AS "preGroupTotal",
         o.group_discount_total AS "groupDiscountTotal",
         o.total                AS "total"
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
         oi.product_id     AS "productId",
         oi.product_name   AS "productName",
         oi.quantity,
         oi.unit_price     AS "unitPrice",
         oi.sale_quantity  AS "saleQuantity",
         oi.sale_price     AS "salePrice",
         oi.product_image  AS "productImage",
         oi.in_stock       AS "inStock",
         -- storage (best-effort)
         sa.name           AS "storageName",
         sa.sort_order     AS "storageSort",
         -- snapshot columns
         oi.group_id           AS "groupId",
         oi.group_bundle_qty   AS "groupBundleQty",
         oi.group_sale_price   AS "groupSalePrice",
         oi.group_unit_price   AS "groupUnitPrice",
         oi.group_discount     AS "groupDiscount",
         -- convenience computed amounts
         (oi.quantity * oi.unit_price) AS "baseTotal",
         CASE
           WHEN oi.sale_quantity IS NOT NULL AND oi.sale_price IS NOT NULL THEN
             (FLOOR(oi.quantity / oi.sale_quantity)::int * oi.sale_price)
             + ((oi.quantity % oi.sale_quantity)::int * oi.unit_price)
           ELSE (oi.quantity * oi.unit_price)
         END AS "afterItemSale",
         oi.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
         oi.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt"
       FROM order_items oi
       LEFT JOIN product_storage ps ON oi.product_id = ps.product_id
       LEFT JOIN storage_areas sa   ON ps.storage_area_id = sa.id
       WHERE oi.order_id = $1
       ORDER BY sa.sort_order NULLS LAST, sa.name NULLS LAST, oi.product_name`,
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

export const GET = withMiddleware(getOrder);
export const PATCH = withMiddleware(updateOrder);
export const DELETE = withMiddleware(deleteOrder);
