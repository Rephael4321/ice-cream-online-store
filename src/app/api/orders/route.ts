// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

/* ---------- Constants from env ---------- */
const DELIVERY_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_DELIVERY_THRESHOLD || 90
);
const DELIVERY_FEE = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);

/* ---------- Helpers: pricing math (SERVER AUTHORITATIVE) ---------- */
/** Skip per-item sale when the item participates in a sale group. */
function computePreGroupTotal(
  items: {
    quantity: number;
    productPrice: number;
    sale?: { amount: number; price: number } | null;
    saleGroup?: {
      id: number;
      quantity: number;
      salePrice: number;
      unitPrice: number | null;
    } | null;
    inStock?: boolean;
  }[]
) {
  return items
    .filter((i) => i.inStock !== false)
    .map((i) => {
      const inGroup = !!i.saleGroup?.id;
      if (!i.sale || inGroup) {
        return i.productPrice * i.quantity;
      }
      const bundles = Math.floor(i.quantity / i.sale.amount);
      const remainder = i.quantity % i.sale.amount;
      return bundles * i.sale.price + remainder * i.productPrice;
    })
    .reduce((a, b) => a + b, 0);
}

/** Allocate group discount across members proportionally; reconcile rounding on the last item. */
function allocateGroupDiscounts(
  items: {
    id: number;
    quantity: number;
    productPrice: number;
    saleGroup?: {
      id: number;
      quantity: number;
      salePrice: number;
      unitPrice: number | null;
    } | null;
    inStock?: boolean;
  }[]
) {
  const perItem = new Map<number, number>();
  let total = 0;

  const groups = new Map<
    number,
    {
      unitPrice: number;
      bundleQty: number;
      bundlePrice: number;
      members: typeof items;
    }
  >();

  for (const it of items) {
    const g = it.saleGroup;
    if (!g || !g.id || !g.quantity || !g.salePrice) continue;
    const unitPrice = g.unitPrice ?? it.productPrice;
    if (!groups.has(g.id)) {
      groups.set(g.id, {
        unitPrice,
        bundleQty: g.quantity,
        bundlePrice: g.salePrice,
        members: [],
      });
    }
    groups.get(g.id)!.members.push(it);
  }

  for (const [, grp] of groups) {
    const members = grp.members.filter(
      (m) => m.inStock !== false && m.quantity > 0
    );
    const totalQty = members.reduce((a, b) => a + b.quantity, 0);
    const bundles = Math.floor(totalQty / grp.bundleQty);
    if (bundles <= 0) continue;

    const regular = bundles * grp.bundleQty * grp.unitPrice;
    const onSale = bundles * grp.bundlePrice;
    const discount = Math.max(0, regular - onSale);
    if (discount <= 0) continue;

    total += discount;

    // proportional split; last item gets the remainder after rounding to 2dp
    const sumQ = totalQty || 1;
    let allocated = 0;
    for (let i = 0; i < members.length; i++) {
      const isLast = i === members.length - 1;
      const m = members[i];
      const raw = (m.quantity / sumQ) * discount;
      const part = isLast
        ? Math.max(0, discount - allocated)
        : Math.round(raw * 100) / 100;
      allocated = Math.round((allocated + part) * 100) / 100;
      perItem.set(m.id, (perItem.get(m.id) || 0) + part);
    }
  }

  return { perItem, total };
}

/* ---------- POST /api/orders: create with snapshots ---------- */
async function createOrder(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const {
      phone,
      items,
      isNotified = false,
    } = body as {
      phone: string;
      items: Array<{
        productId: number;
        productName?: string;
        productImage?: string | null;
        quantity: number;
        unitPrice: number;
        saleQuantity?: number | null;
        salePrice?: number | null;
        inStock?: boolean;
      }>;
      isNotified?: boolean;
    };

    if (!phone || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid order payload" },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    // upsert/find client
    const existingClient = await client.query<{ id: number }>(
      `SELECT id FROM clients WHERE phone = $1`,
      [phone]
    );
    const clientId =
      existingClient.rows[0]?.id ??
      (
        await client.query<{ id: number }>(
          `INSERT INTO clients (phone) VALUES ($1) RETURNING id`,
          [phone]
        )
      ).rows[0].id;

    // validate products and load authoritative unit prices
    const productIds = items.map((i) => i.productId);
    const { rows: validRows } = await client.query<{
      id: number;
      price: string | number;
    }>(`SELECT id, price FROM products WHERE id = ANY($1::int[])`, [
      productIds,
    ]);
    const validIds = new Set(validRows.map((r) => r.id));
    const priceById = new Map(validRows.map((r) => [r.id, Number(r.price)]));

    if (validIds.size === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "None of the products in your cart are available anymore." },
        { status: 400 }
      );
    }

    // per-product sales
    const { rows: saleRows } = await client.query(
      `SELECT product_id, quantity, sale_price FROM sales WHERE product_id = ANY($1::int[])`,
      [productIds]
    );
    const saleById = new Map<
      number,
      { amount: number; price: number } | null
    >();
    for (const r of saleRows) {
      if (r.quantity != null && r.sale_price != null) {
        saleById.set(r.product_id, {
          amount: Number(r.quantity),
          price: Number(r.sale_price),
        });
      }
    }

    // sale-group metadata
    const { rows: groupRows } = await client.query(
      `SELECT psg.product_id,
              psg.sale_group_id      AS "saleGroupId",
              sg.quantity            AS "groupQty",
              sg.sale_price          AS "groupSalePrice",
              sg.price               AS "groupUnitPrice"
       FROM product_sale_groups psg
       JOIN sale_groups sg ON sg.id = psg.sale_group_id
       WHERE psg.product_id = ANY($1::int[])`,
      [productIds]
    );
    const groupByProductId = new Map<number, any>();
    for (const g of groupRows) groupByProductId.set(g.product_id, g);

    // authoritative pricing items (snapshot inputs)
    const pricingItems = items
      .filter((i) => validIds.has(i.productId))
      .map((i) => {
        const unitPrice = priceById.get(i.productId) ?? Number(i.unitPrice);
        const s = saleById.get(i.productId) ?? null;
        const g = groupByProductId.get(i.productId);
        const saleGroup = g
          ? {
              id: Number(g.saleGroupId),
              quantity: Number(g.groupQty),
              salePrice: Number(g.groupSalePrice),
              unitPrice:
                g.groupUnitPrice != null ? Number(g.groupUnitPrice) : unitPrice,
            }
          : null;

        return {
          id: i.productId,
          productName: i.productName ?? null,
          productImage: i.productImage ?? null,
          quantity: Number(i.quantity),
          productPrice: Number(unitPrice),
          sale: s,
          saleGroup,
          inStock: i.inStock ?? true,
        };
      });

    // totals (server-authoritative)
    const preGroupTotal = computePreGroupTotal(pricingItems);
    const { perItem, total: groupDiscountTotal } = allocateGroupDiscounts(
      pricingItems.map((p) => ({
        id: p.id,
        quantity: p.quantity,
        productPrice: p.productPrice,
        saleGroup: p.saleGroup,
        inStock: p.inStock,
      }))
    );

    const subtotal = Math.max(0, preGroupTotal - groupDiscountTotal);
    const deliveryFee =
      subtotal > 0 && subtotal < DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
    const total = subtotal + deliveryFee;

    // insert order (snapshot totals + delivery_fee)
    const orderResult = await client.query<{ id: number }>(
      `INSERT INTO orders
         (client_id, is_notified, pre_group_total, group_discount_total, delivery_fee, total)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        clientId,
        isNotified,
        preGroupTotal,
        groupDiscountTotal,
        deliveryFee,
        total,
      ]
    );
    const orderId = orderResult.rows[0].id;

    // insert items (including per-item group_discount allocation)
    let missingCount = 0;
    for (const raw of items) {
      if (!validIds.has(raw.productId)) {
        missingCount++;
        continue;
      }
      const it = pricingItems.find((p) => p.id === raw.productId)!;
      const g = it.saleGroup;
      const gDiscount = Number(perItem.get(it.id) || 0);

      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name, product_image, quantity, unit_price,
            sale_quantity, sale_price, in_stock,
            group_id, group_bundle_qty, group_sale_price, group_unit_price, group_discount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          orderId,
          it.id,
          it.productName,
          it.productImage,
          it.quantity,
          it.productPrice,
          it.sale?.amount ?? null,
          it.sale?.price ?? null,
          it.inStock ?? true,
          g?.id ?? null,
          g?.quantity ?? null,
          g?.salePrice ?? null,
          g?.unitPrice ?? null,
          gDiscount,
        ]
      );
    }

    await client.query("COMMIT");

    const baseResponse: any = {
      orderId,
      preGroupTotal,
      groupDiscountTotal,
      subtotal,
      deliveryFee,
      total,
    };
    if (missingCount > 0) {
      baseResponse.warning = `${missingCount} item(s) were not available and skipped.`;
    }
    return NextResponse.json(baseResponse);
  } catch (err: unknown) {
    await pool.query("ROLLBACK");
    console.error("Error creating order:", err);
    const error = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error }, { status: 500 });
  } finally {
    client.release();
  }
}

/* ---------- GET /api/orders: list with snapshot totals ---------- */
async function listOrders(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");

    const values: any[] = [];
    let whereClause = `WHERE o.is_visible = true`;

    if (from && to) {
      const fromLocal = `${from}T00:00:00`;
      const toLocal = `${to}T23:59:59`;
      whereClause += ` AND o.created_at >= $1 AND o.created_at <= $2`;
      values.push(fromLocal, toLocal);
    }

    const result = await pool.query(
      `
      SELECT
        o.id AS "orderId",
        o.is_paid AS "isPaid",
        o.is_ready AS "isReady",
        o.is_test AS "isTest",
        o.is_notified AS "isNotified",
        o.payment_method AS "paymentMethod",
        o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
        o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt",
        COUNT(oi.id) AS "itemCount",
        c.name AS "clientName",
        c.address AS "clientAddress",
        c.phone AS "clientPhone",
        o.pre_group_total      AS "preGroupTotal",
        o.group_discount_total AS "groupDiscountTotal",
        o.total                AS "total"
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

/* ---------- Exports ---------- */
export const GET = withMiddleware(listOrders);
export const POST = withMiddleware(createOrder, { skipAuth: true });
