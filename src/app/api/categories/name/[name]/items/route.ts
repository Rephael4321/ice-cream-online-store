import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

// DB row shapes
type ProductRow = {
  id: number;
  sort_order: number | null;
  name: string | null;
  image: string | null;
  price: string | number | null;
  in_stock: boolean | null;
  product_sale_quantity: number | null;
  product_sale_price: string | number | null;
};

type SaleGroupRow = {
  id: number;
  sort_order: number | null;
  name: string | null;
  image: string | null;
  price: string | number | null;
  sale_price: string | number | null;
  quantity: number | null;
};

async function getItemsByCategoryName(
  _req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await ctx.params;
    const slug = decodeURIComponent(name);

    // 1) Resolve category
    const catRes = await pool.query<{ id: number }>(
      `
      SELECT id
      FROM categories
      WHERE LOWER(REPLACE(name, ' ', '-')) = LOWER($1)
      LIMIT 1
      `,
      [slug]
    );

    if (catRes.rowCount === 0) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const categoryId = catRes.rows[0].id;

    // 2) Products in category
    const productsRes = await pool.query<ProductRow>(
      `
      SELECT
        mi.target_id                      AS id,
        mi.sort_order                     AS sort_order,
        p.name                            AS name,
        p.image                           AS image,
        p.price                           AS price,
        p.in_stock                        AS in_stock,
        s.quantity                        AS product_sale_quantity,
        s.sale_price                      AS product_sale_price
      FROM category_multi_items mi
      JOIN products p
           ON mi.target_type = 'product' AND p.id = mi.target_id
      LEFT JOIN sales s
           ON s.product_id = p.id
      WHERE mi.category_id = $1
      `,
      [categoryId]
    );

    const productRows = productsRes.rows;
    const productIds = productRows.map((r) => r.id);

    // 3) Best category sale per product (optional, your existing logic)
    const bestCategorySale = new Map<
      number,
      { amount: number; price: number }
    >();
    if (productIds.length > 0) {
      const catSalesRes = await pool.query(
        `
        SELECT
          mi.target_id AS product_id,
          cs.quantity  AS quantity,
          cs.sale_price
        FROM category_multi_items mi
        JOIN categories c      ON c.id = mi.category_id
        JOIN category_sales cs ON cs.category_id = c.id
        WHERE mi.target_type = 'product'
          AND mi.target_id = ANY ($1::int[])
          AND c.type = 'sale'
        `,
        [productIds]
      );

      for (const row of catSalesRes.rows) {
        const pid = Number(row.product_id);
        const price = Number(row.sale_price);
        const qty = Number(row.quantity);
        const existing = bestCategorySale.get(pid);
        if (!existing || price < existing.price) {
          bestCategorySale.set(pid, { amount: qty, price });
        }
      }
    }

    // 4) NEW: current sale-group membership per product (global, not just this category)
    const productGroup = new Map<
      number,
      {
        id: number;
        name: string | null;
        price: number | null;
        sale_price: number | null;
        quantity: number | null;
      }
    >();

    if (productIds.length > 0) {
      const psgRes = await pool.query(
        `
        SELECT
          psg.product_id,
          sg.id          AS group_id,
          sg.name        AS group_name,
          sg.price       AS group_price,
          sg.sale_price  AS group_sale_price,
          sg.quantity    AS group_quantity
        FROM product_sale_groups psg
        JOIN sale_groups sg ON sg.id = psg.sale_group_id
        WHERE psg.product_id = ANY ($1::int[])
        `,
        [productIds]
      );

      for (const r of psgRes.rows) {
        const pid = Number(r.product_id);
        // If you allow only one membership, last-write wins is fine; otherwise choose your rule here.
        productGroup.set(pid, {
          id: Number(r.group_id),
          name: r.group_name ?? null,
          price: r.group_price != null ? Number(r.group_price) : null,
          sale_price:
            r.group_sale_price != null ? Number(r.group_sale_price) : null,
          quantity: r.group_quantity != null ? Number(r.group_quantity) : null,
        });
      }
    }

    // 5) Normalize product items with membership
    const productItems = productRows.map((r) => {
      const pSale = bestCategorySale.get(r.id);
      const sale_price =
        pSale?.price ??
        (r.product_sale_price != null ? Number(r.product_sale_price) : null);
      const sale_quantity =
        pSale?.amount ??
        (r.product_sale_quantity != null
          ? Number(r.product_sale_quantity)
          : null);

      const group = productGroup.get(r.id) ?? null;

      return {
        type: "product" as const,
        id: r.id,
        name: r.name ?? "",
        image: r.image,
        price: r.price != null ? Number(r.price) : 0,
        sale_price: sale_price ?? null,
        sale_quantity: sale_quantity ?? null,
        sort_order: r.sort_order ?? 0,
        // NEW: expose sale-group on the product item
        group,
      };
    });

    // 6) Sale-group items linked to this category (unchanged)
    const groupsRes = await pool.query<SaleGroupRow>(
      `
      SELECT
        mi.target_id           AS id,
        mi.sort_order          AS sort_order,
        g.name                 AS name,
        g.image                AS image,
        g.price                AS price,
        g.sale_price           AS sale_price,
        g.quantity             AS quantity
      FROM category_multi_items mi
      JOIN sale_groups g
           ON mi.target_type = 'sale_group' AND g.id = mi.target_id
      WHERE mi.category_id = $1
      `,
      [categoryId]
    );

    const groupRows = groupsRes.rows;
    const groupIds = groupRows.map((g) => g.id);

    // 7) Expand products per sale_group (unchanged)
    const groupProducts = new Map<
      number,
      {
        id: number;
        name: string;
        image: string;
        label: string;
        color: string;
      }[]
    >();

    if (groupIds.length > 0) {
      const gpRes = await pool.query(
        `
        SELECT
          psg.sale_group_id AS group_id,
          p.id              AS id,
          p.name            AS name,
          p.image           AS image,
          COALESCE(psg.label, '') AS label,
          COALESCE(psg.color, '') AS color
        FROM product_sale_groups psg
        JOIN products p ON p.id = psg.product_id
        WHERE psg.sale_group_id = ANY ($1::int[])
        ORDER BY p.name ASC
        `,
        [groupIds]
      );

      for (const row of gpRes.rows) {
        const gId = Number(row.group_id);
        if (!groupProducts.has(gId)) groupProducts.set(gId, []);
        groupProducts.get(gId)!.push({
          id: Number(row.id),
          name: String(row.name ?? ""),
          image: String(row.image ?? ""),
          label: String(row.label ?? ""),
          color: String(row.color ?? ""),
        });
      }
    }

    const saleGroupItems = groupRows.map((g) => ({
      type: "sale_group" as const,
      id: g.id,
      name: g.name ?? "",
      image: g.image ?? null,
      price: g.price != null ? Number(g.price) : 0,
      sale_price: g.sale_price != null ? Number(g.sale_price) : 0,
      quantity: g.quantity != null ? Number(g.quantity) : 0,
      sort_order: g.sort_order ?? 0,
      products: groupProducts.get(g.id) ?? [],
    }));

    // 8) Merge & sort
    const items = [...productItems, ...saleGroupItems].sort(
      (a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9)
    );

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("❌ Error in /api/categories/name/[name]/items:", err);
    return NextResponse.json(
      { items: [], error: "Server error" },
      { status: 200 }
    );
  }
}

export const GET = withMiddleware(getItemsByCategoryName);
