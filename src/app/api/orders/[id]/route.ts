import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";
import { z } from "zod";

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
  if (!Number.isInteger(orderId)) {
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

/** PATCH supports ONLY:
 *  - { isTest: boolean }
 *  - { name?: string, address?: string } (at least one present)
 *  For payment/status use:
 *   - PATCH /api/orders/:id/payment
 *   - PATCH /api/orders/:id/status
 */
const TestSchema = z.object({ isTest: z.boolean() });
const ClientSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    address: z.string().trim().min(1).optional(),
  })
  .refine((v) => typeof v.name === "string" || typeof v.address === "string", {
    message: "At least one of 'name' or 'address' is required",
  });

async function updateOrder(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Hard fail if someone tries to update these here
  if (
    typeof (body as any)?.isPaid !== "undefined" ||
    typeof (body as any)?.isReady !== "undefined"
  ) {
    return NextResponse.json(
      {
        error:
          "Use dedicated endpoints for payment/status. " +
          "Payment: PATCH /api/orders/:id/payment, Status: PATCH /api/orders/:id/status",
      },
      { status: 400 }
    );
  }

  // 1) Mark/unmark test
  const testParsed = TestSchema.safeParse(body);
  if (testParsed.success) {
    try {
      const result = await pool.query(
        `UPDATE orders SET is_test = $1, updated_at = now() WHERE id = $2 RETURNING is_test AS "isTest"`,
        [testParsed.data.isTest, orderId]
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ isTest: result.rows[0].isTest });
    } catch (err) {
      console.error("❌ Error updating is_test:", err);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }
  }

  // 2) Update client details (name/address)
  const clientParsed = ClientSchema.safeParse(body);
  if (clientParsed.success) {
    try {
      const orderRes = await pool.query<{ client_id: number }>(
        `SELECT client_id FROM orders WHERE id = $1`,
        [orderId]
      );
      if (orderRes.rowCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      const clientId = orderRes.rows[0].client_id;

      const { name, address } = clientParsed.data;

      await pool.query(
        `UPDATE clients
           SET name = COALESCE($1, name),
               address = COALESCE($2, address)
         WHERE id = $3`,
        [name ?? null, address ?? null, clientId]
      );

      const clientResult = await pool.query(
        `SELECT name, address, phone FROM clients WHERE id = $1`,
        [clientId]
      );

      return NextResponse.json({
        name: clientResult.rows[0].name,
        address: clientResult.rows[0].address,
        phone: clientResult.rows[0].phone,
      });
    } catch (err) {
      console.error("❌ Error updating client details:", err);
      return NextResponse.json(
        { error: "Failed to update client" },
        { status: 500 }
      );
    }
  }

  // 3) Unsupported body
  return NextResponse.json(
    {
      error:
        "Unsupported body. This endpoint only supports { isTest } or { name, address }. " +
        "For payment use /payment, for readiness use /status.",
    },
    { status: 400 }
  );
}

async function deleteOrder(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    await pool.query(
      `UPDATE orders SET is_visible = false, updated_at = now() WHERE id = $1`,
      [orderId]
    );
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
