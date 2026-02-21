import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

/* ─── GET (public): return out-of-stock product IDs for given order ─── */
async function getOutOfStock(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = Number(id);
  if (isNaN(orderId))
    return NextResponse.json({ outOfStock: [] }, { status: 400 });

  const { rows } = await pool.query<{ product_id: number }>(
    `SELECT oi.product_id
       FROM order_items oi
       JOIN products    p ON p.id = oi.product_id
      WHERE oi.order_id = $1 AND p.in_stock = FALSE`,
    [orderId]
  );

  return NextResponse.json({ outOfStock: rows.map((r) => r.product_id) });
}

/* ─── PATCH (admin only): toggle product stock status ─── */
async function updateProductStock(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = Number(id);
  if (isNaN(orderId))
    return NextResponse.json({ error: "Bad order id" }, { status: 400 });

  const { productId, inStock } = (await req.json()) as {
    productId: number;
    inStock: boolean;
  };

  // ── Compute-and-persist totals within a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure product belongs to this order
    const { rowCount } = await client.query(
      `SELECT 1 FROM order_items WHERE order_id = $1 AND product_id = $2`,
      [orderId, productId]
    );
    if (rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: "Product not part of order" },
        { status: 404 }
      );
    }

    // Update global product stock (preserve current behavior)
    await client.query(`UPDATE products SET in_stock = $1 WHERE id = $2`, [
      inStock,
      productId,
    ]);

    // Update only this order's item stock
    await client.query(
      `UPDATE order_items SET in_stock = $1 WHERE order_id = $2 AND product_id = $3`,
      [inStock, orderId, productId]
    );

    // Load snapshot rows for this order
    const { rows: items } = await client.query(
      `SELECT
         quantity,
         unit_price     AS "unitPrice",
         sale_quantity  AS "saleQuantity",
         sale_price     AS "salePrice",
         in_stock       AS "inStock",
         group_id       AS "groupId",
         group_bundle_qty   AS "groupBundleQty",
         group_sale_price   AS "groupSalePrice",
         group_unit_price   AS "groupUnitPrice"
       FROM order_items
       WHERE order_id = $1`,
      [orderId]
    );

    // Pricing math from snapshots, considering only in-stock items
    const inStockItems = items.filter((it: any) => it.inStock !== false);

    // pre_group_total (apply per-item sale only when not in a group)
    let preGroupTotal = 0;
    for (const it of inStockItems) {
      const qty = Number(it.quantity || 0);
      const unitPrice = Number(it.unitPrice || 0);
      let line = unitPrice * qty;
      const inGroup = it.groupId != null;
      const saleQty = it.saleQuantity != null ? Number(it.saleQuantity) : null;
      const salePrice = it.salePrice != null ? Number(it.salePrice) : null;
      if (!inGroup && saleQty && salePrice != null && qty >= saleQty) {
        const bundles = Math.floor(qty / saleQty);
        const remainder = qty % saleQty;
        line = bundles * salePrice + remainder * unitPrice;
      }
      preGroupTotal += line;
    }

    // group_discount_total
    // Group members by groupId
    const groups = new Map<number, any[]>();
    for (const it of inStockItems) {
      if (it.groupId == null) continue;
      const gid = Number(it.groupId);
      if (!groups.has(gid)) groups.set(gid, []);
      groups.get(gid)!.push(it);
    }
    let groupDiscountTotal = 0;
    for (const [gid, members] of groups) {
      const totalQty = members.reduce((sum, m: any) => sum + Number(m.quantity || 0), 0);
      const bundleQty = Number(members[0].groupBundleQty || 0);
      const bundlePrice = Number(members[0].groupSalePrice || 0);
      const unitPriceForGroup = (m: any) =>
        m.groupUnitPrice != null ? Number(m.groupUnitPrice) : Number(m.unitPrice || 0);
      if (!bundleQty || !bundlePrice) continue;
      const bundles = Math.floor(totalQty / bundleQty);
      if (bundles <= 0) continue;
      const regular = bundles * bundleQty * unitPriceForGroup(members[0]);
      const onSale = bundles * bundlePrice;
      const discount = Math.max(0, regular - onSale);
      groupDiscountTotal += discount;
    }

    const subtotal = Math.max(0, preGroupTotal - groupDiscountTotal);
    const DELIVERY_THRESHOLD = Number(process.env.NEXT_PUBLIC_DELIVERY_THRESHOLD || 90);
    const DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);
    const deliveryFee = subtotal > 0 && subtotal < DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
    const total = subtotal + deliveryFee;

    await client.query(
      `UPDATE orders
          SET pre_group_total = $1,
              group_discount_total = $2,
              delivery_fee = $3,
              total = $4,
              updated_at = now()
        WHERE id = $5`,
      [preGroupTotal, groupDiscountTotal, deliveryFee, total, orderId]
    );

    await client.query('COMMIT');
    return NextResponse.json({
      preGroupTotal,
      groupDiscountTotal,
      deliveryFee,
      total,
    });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch {}
    console.error('❌ Stock update failed:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    try { client.release(); } catch {}
  }
}

// ✅ Export with middleware (GET remains public, PATCH is protected)
export const GET = withMiddleware(getOutOfStock);
export const PATCH = withMiddleware(updateProductStock);
