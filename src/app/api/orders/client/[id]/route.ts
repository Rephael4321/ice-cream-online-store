import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";
import { validateClientOrderAccess } from "@/lib/api/validate-client-order-access";

async function handler(
  _req: NextRequest,
  context: { phone: string; orderId: number }
) {
  const { orderId, phone } = context;

  // Order header incl. snapshot totals + delivery_fee
  const orderResult = await pool.query(
    `SELECT 
      o.id AS "orderId",
      o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
      o.is_paid AS "isPaid",
      o.is_ready AS "isReady",
      o.is_delivered AS "isDelivered",
      c.name AS "clientName",
      c.address AS "clientAddress",
      c.phone AS "clientPhone",
      o.pre_group_total AS "preGroupTotal",
      o.group_discount_total AS "groupDiscountTotal",
      o.delivery_fee AS "deliveryFee",
      o.total AS "total"
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    WHERE o.id = $1 AND o.is_visible = true AND c.phone = $2
    LIMIT 1`,
    [orderId, phone]
  );

  if (orderResult.rowCount === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = orderResult.rows[0];

  // Items: include group snapshot columns
  const itemsRes = await pool.query(
    `SELECT
      oi.product_name,
      oi.product_image,
      oi.quantity,
      oi.unit_price,
      oi.sale_quantity,
      oi.sale_price,
      oi.in_stock,
      oi.group_id,
      oi.group_bundle_qty,
      oi.group_sale_price,
      oi.group_unit_price,
      oi.group_discount
     FROM order_items oi
     WHERE oi.order_id = $1
     ORDER BY oi.product_name`,
    [orderId]
  );

  // Compute payable from snapshot (no re-fetch of products table)
  const items = itemsRes.rows.map((row: any) => {
    const quantity = Number(row.quantity || 0);
    const unitPrice = row.unit_price != null ? Number(row.unit_price) : 0;
    const saleQuantity =
      row.sale_quantity != null ? Number(row.sale_quantity) : null;
    const salePrice = row.sale_price != null ? Number(row.sale_price) : null;

    const inGroup = row.group_id != null;
    const groupDiscount =
      row.group_discount != null ? Number(row.group_discount) : 0;

    const base = unitPrice * quantity;

    let afterItemSale = base;
    // Do NOT apply per-item sale if item is part of a sale group
    if (
      !inGroup &&
      saleQuantity &&
      salePrice != null &&
      quantity >= saleQuantity
    ) {
      const bundles = Math.floor(quantity / saleQuantity);
      const rest = quantity % saleQuantity;
      afterItemSale = bundles * salePrice + rest * unitPrice;
    }

    const total = Math.max(0, afterItemSale - groupDiscount);

    return {
      product_name: row.product_name,
      product_image: row.product_image,
      quantity,
      unit_price: unitPrice,
      sale_quantity: saleQuantity,
      sale_price: salePrice,
      in_stock: row.in_stock,

      group_id: row.group_id,
      group_bundle_qty:
        row.group_bundle_qty != null ? Number(row.group_bundle_qty) : null,
      group_sale_price:
        row.group_sale_price != null ? Number(row.group_sale_price) : null,
      group_unit_price:
        row.group_unit_price != null ? Number(row.group_unit_price) : null,
      group_discount: groupDiscount,

      total,
    };
  });

  // Prefer the stored total; fallback to recompute from items
  const finalTotal =
    order.total != null
      ? Number(order.total)
      : items.reduce((sum: number, it: any) => sum + Number(it.total || 0), 0);

  return NextResponse.json({
    order: {
      ...order,
      preGroupTotal:
        order.preGroupTotal != null ? Number(order.preGroupTotal) : null,
      groupDiscountTotal:
        order.groupDiscountTotal != null ? Number(order.groupDiscountTotal) : 0,
      deliveryFee: order.deliveryFee != null ? Number(order.deliveryFee) : null,
      total: finalTotal,
    },
    items,
  });
}

export const GET = withMiddleware(handler, {
  middleware: validateClientOrderAccess,
});
