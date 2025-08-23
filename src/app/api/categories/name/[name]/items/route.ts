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

    // 1) Resolve category by slugified name (spaces <-> dashes)
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
      // Keep UX smooth: same shape, empty list
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const categoryId = catRes.rows[0].id;

    // 2) Pull product items linked to this category
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

    // 3) Best category-sale per product (if any) coming from ANY 'sale' category that includes the product
    let bestCategorySale = new Map<number, { amount: number; price: number }>();

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

    // 4) Normalize product items into UI shape
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

      return {
        type: "product" as const,
        id: r.id,
        name: r.name ?? "",
        image: r.image,
        price: r.price != null ? Number(r.price) : 0,
        sale_price: sale_price ?? null,
        sale_quantity: sale_quantity ?? null,
        sort_order: r.sort_order ?? 0,
      };
    });

    // 5) Pull sale_group items linked to this category
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

    // 6) Expand products per sale_group
    let groupProducts = new Map<
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

    // 7) Merge & sort by sort_order (NULLS LAST fallback via large number)
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
