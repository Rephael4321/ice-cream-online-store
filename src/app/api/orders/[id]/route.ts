// app/api/orders/[id]/route.ts
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
  isDelivered?: boolean;
  isTest: boolean;
  isNotified: boolean;
  preGroupTotal: number | null;
  groupDiscountTotal: number;
  deliveryFee: number | null;
  total: number | null;
  paymentMethod: "" | "credit" | "paybox" | "cash" | null;
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

  // Group snapshot (per item)
  groupId: number | null;
  groupBundleQty: number | null;
  groupSalePrice: number | null;
  groupUnitPrice: number | null;
  groupDiscount: number;

  baseTotal: number | null;
  afterItemSale: number | null;
};

/* -------------------- GET /api/orders/:id -------------------- */
async function getOrder(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (!Number.isInteger(orderId)) {
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
         o.is_delivered AS "isDelivered",
         o.is_test AS "isTest",
         o.is_notified AS "isNotified",
         o.payment_method AS "paymentMethod",
         o.pre_group_total      AS "preGroupTotal",
         o.group_discount_total AS "groupDiscountTotal",
         o.delivery_fee         AS "deliveryFee",
         o.total                AS "total"
       FROM orders o
       LEFT JOIN clients c ON o.client_id = c.id
       WHERE o.id = $1`,
      [orderId]
    );

    const order = orderResult.rows[0];
    if (!order) {
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
         sa.name           AS "storageName",
         sa.sort_order     AS "storageSort",

         -- ⬇️ group snapshot columns per item (already allocated on write)
         oi.group_id           AS "groupId",
         oi.group_bundle_qty   AS "groupBundleQty",
         oi.group_sale_price   AS "groupSalePrice",
         oi.group_unit_price   AS "groupUnitPrice",
         oi.group_discount     AS "groupDiscount",

         (oi.quantity * oi.unit_price) AS "baseTotal",
         CASE
           WHEN oi.group_id IS NULL
                AND oi.sale_quantity IS NOT NULL
                AND oi.sale_price   IS NOT NULL
           THEN (FLOOR(oi.quantity / oi.sale_quantity)::int * oi.sale_price)
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

    return NextResponse.json({ order, items: itemsResult.rows });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Failed to fetch order";
    return NextResponse.json({ error }, { status: 500 });
  }
}

/* -------------------- PATCH /api/orders/:id -------------------- */
function normalizeToNullOrString(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  return undefined;
}

async function updateOrder(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body?.isPaid !== undefined || body?.isReady !== undefined) {
    return NextResponse.json(
      {
        error:
          "Use dedicated endpoints for payment/status. Payment: PATCH /api/orders/:id/payment, Status: PATCH /api/orders/:id/status",
      },
      { status: 400 }
    );
  }

  if (Object.prototype.hasOwnProperty.call(body ?? {}, "isTest")) {
    if (typeof body.isTest !== "boolean") {
      return NextResponse.json(
        { error: "`isTest` must be a boolean" },
        { status: 400 }
      );
    }
    try {
      const result = await pool.query(
        `UPDATE orders
           SET is_test = $1, updated_at = now()
         WHERE id = $2
         RETURNING is_test AS "isTest"`,
        [body.isTest, orderId]
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ isTest: result.rows[0].isTest });
    } catch {
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }
  }

  const name = normalizeToNullOrString(body?.name);
  const address = normalizeToNullOrString(body?.address);

  if (name === undefined && address === undefined) {
    return NextResponse.json(
      {
        error:
          "Unsupported body. Provide at least one of { name, address } (use empty string to clear).",
      },
      { status: 400 }
    );
  }

  try {
    const orderRes = await pool.query<{ client_id: number }>(
      `SELECT client_id FROM orders WHERE id = $1`,
      [orderId]
    );
    if (orderRes.rowCount === 0 || !orderRes.rows[0].client_id) {
      return NextResponse.json(
        { error: "Order not found or has no client attached" },
        { status: 404 }
      );
    }
    const clientId = orderRes.rows[0].client_id;

    const setParts: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (name !== undefined) {
      setParts.push(`name = $${i++}`);
      values.push(name);
    }
    if (address !== undefined) {
      setParts.push(`address = $${i++}`);
      values.push(address);
    }
    setParts.push(`updated_at = now()`);

    await pool.query(
      `UPDATE clients
         SET ${setParts.join(", ")}
       WHERE id = $${i}`,
      [...values, clientId]
    );

    const clientResult = await pool.query(
      `SELECT name, address, phone FROM clients WHERE id = $1`,
      [clientId]
    );

    return NextResponse.json(clientResult.rows[0]);
  } catch {
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

/* -------------------- DELETE /api/orders/:id -------------------- */
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
  } catch {
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getOrder);
export const PATCH = withMiddleware(updateOrder);
export const DELETE = withMiddleware(deleteOrder);
