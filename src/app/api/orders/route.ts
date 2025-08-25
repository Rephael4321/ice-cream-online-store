import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

/* ---------- Helpers: pricing math (server-authoritative) ---------- */

function computePreGroupTotal(
  items: {
    quantity: number;
    productPrice: number;
    sale?: { amount: number; price: number } | null;
    inStock?: boolean;
  }[]
) {
  return items
    .filter((i) => i.inStock !== false)
    .map((i) => {
      if (!i.sale) return i.productPrice * i.quantity;
      const bundles = Math.floor(i.quantity / i.sale.amount);
      const remainder = i.quantity % i.sale.amount;
      return bundles * i.sale.price + remainder * i.productPrice;
    })
    .reduce((a, b) => a + b, 0);
}

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

  // group by saleGroup.id
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
    const totalQty = grp.members.reduce(
      (a, b) => a + (b.inStock === false ? 0 : b.quantity),
      0
    );
    const bundles = Math.floor(totalQty / grp.bundleQty);
    if (bundles <= 0) continue;

    const regular = bundles * grp.bundleQty * grp.unitPrice;
    const onSale = bundles * grp.bundlePrice;
    const discount = Math.max(0, regular - onSale);
    if (discount <= 0) continue;

    total += discount;

    const sumQ =
      grp.members.reduce(
        (a, b) => a + (b.inStock === false ? 0 : b.quantity),
        0
      ) || 1;
    for (const m of grp.members) {
      const part = ((m.inStock === false ? 0 : m.quantity) / sumQ) * discount;
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

    // sale-group metadata from DB
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

    // build authoritative pricing items (snapshot inputs)
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

    // totals
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

    const subtotal = preGroupTotal - groupDiscountTotal; // NEW
    const deliveryFee = subtotal > 0 && subtotal < 90 ? 10 : 0; // NEW
    const total = subtotal + deliveryFee; // NEW

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

    // insert items (snapshot per-item group fields)
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
      subtotal, // NEW (useful for UI/debug)
      deliveryFee, // NEW
      total, // includes delivery
    };
    if (missingCount > 0) {
      baseResponse.warning = `${missingCount} item(s) were not available and skipped.`;
    }
    return NextResponse.json(baseResponse);
  } catch (err: unknown) {
    await client.query("ROLLBACK");
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
        o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
        o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt",
        COUNT(oi.id) AS "itemCount",
        c.name AS "clientName",
        c.address AS "clientAddress",
        c.phone AS "clientPhone",
        -- snapshot totals (nullable for legacy orders)
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
