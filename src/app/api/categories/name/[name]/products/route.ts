import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

type ProductRow = {
  id: number;
  name: string | null;
  price: number | string | null;
  image: string | null;
  in_stock: boolean | null;
  productSaleQuantity: number | null;
  productSalePrice: number | string | null;
  sort_order: number | null;
};

type GroupSaleRow = {
  product_id: number;
  group_id: number;
  group_name: string | null;
  group_quantity: number | null;
  group_sale_price: number | string | null;
};

function pickBestSale(
  candidates: Array<null | {
    source: "category" | "product" | "group";
    amount: number;
    price: number;
    meta?: any;
  }>
) {
  // Filter valid
  const valid = candidates.filter(
    (s): s is NonNullable<typeof s> =>
      !!s &&
      Number.isFinite(s.amount) &&
      s.amount > 0 &&
      Number.isFinite(s.price)
  );

  if (valid.length === 0) return null;

  // Compare by unit price, then by total price (tie-breaker), then prefer group > category > product (deterministic)
  const rank = { group: 0, category: 1, product: 2 } as const;

  valid.sort((a, b) => {
    const ua = a.price / a.amount;
    const ub = b.price / b.amount;
    if (ua !== ub) return ua - ub;
    if (a.price !== b.price) return a.price - b.price;
    return rank[a.source] - rank[b.source];
  });

  return valid[0];
}

async function getProductsByCategoryName(
  _req: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await context.params;
    const slug = decodeURIComponent(name);

    // Resolve category
    const categoryRes = await pool.query<{ id: number }>(
      `SELECT id FROM categories
       WHERE LOWER(REPLACE(name, ' ', '-')) = LOWER($1)
       LIMIT 1`,
      [slug]
    );
    if (categoryRes.rowCount === 0) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }
    const categoryId = categoryRes.rows[0].id;

    // Base product list
    const itemsResult = await pool.query<ProductRow>(
      `
      SELECT 
        mi.target_id AS id,
        mi.sort_order,
        p.name,
        p.price,
        p.image,
        p.in_stock,
        s.quantity AS "productSaleQuantity",
        s.sale_price AS "productSalePrice"
      FROM category_multi_items mi
      JOIN products p ON mi.target_type = 'product' AND p.id = mi.target_id
      LEFT JOIN sales s ON s.product_id = p.id
      WHERE mi.category_id = $1
      ORDER BY mi.sort_order ASC NULLS LAST, p.name ASC
      `,
      [categoryId]
    );
    const products = itemsResult.rows;
    const productIds = products.map((p) => p.id);

    // Category-based sales (per product)
    let categorySaleMap = new Map<
      number,
      { amount: number; price: number; category: { id: number; name: string } }
    >();

    if (productIds.length > 0) {
      const categorySalesResult = await pool.query(
        `
        SELECT 
          mi.target_id AS "productId",
          c.id        AS "categoryId",
          c.name      AS "categoryName",
          cs.quantity,
          cs.sale_price
        FROM category_multi_items mi
        JOIN categories c     ON c.id = mi.category_id
        JOIN category_sales cs ON cs.category_id = c.id
        WHERE mi.target_type = 'product'
          AND mi.target_id = ANY($1::int[])
          AND c.type = 'sale'
        `,
        [productIds]
      );

      categorySaleMap = new Map();
      for (const row of categorySalesResult.rows) {
        const priceNum =
          row.sale_price != null ? Number(row.sale_price) : undefined;
        const existing = categorySaleMap.get(row.productId);
        if (
          !existing ||
          (priceNum !== undefined && priceNum < existing.price)
        ) {
          categorySaleMap.set(row.productId, {
            amount: Number(row.quantity),
            price: Number(priceNum),
            category: {
              id: row.categoryId,
              name: String(row.categoryName).replace(/-/g, " "),
            },
          });
        }
      }
    }

    // NEW: sale-group membership & sale values
    let groupSaleMap = new Map<
      number,
      {
        id: number;
        name: string | null;
        amount: number | null;
        price: number | null;
      }
    >();

    if (productIds.length > 0) {
      const groupRes = await pool.query<GroupSaleRow>(
        `
        SELECT 
          psg.product_id,
          sg.id           AS group_id,
          sg.name         AS group_name,
          sg.quantity     AS group_quantity,
          sg.sale_price   AS group_sale_price
        FROM product_sale_groups psg
        JOIN sale_groups sg ON sg.id = psg.sale_group_id
        WHERE psg.product_id = ANY($1::int[])
        `,
        [productIds]
      );

      for (const r of groupRes.rows) {
        groupSaleMap.set(r.product_id, {
          id: r.group_id,
          name: r.group_name,
          amount: r.group_quantity != null ? Number(r.group_quantity) : null,
          price: r.group_sale_price != null ? Number(r.group_sale_price) : null,
        });
      }
    }

    // Build final list with BEST sale + saleGroup info for UI grouping
    const finalProducts = products.map((product) => {
      const basePrice = product.price != null ? Number(product.price) : null;

      const cat = categorySaleMap.get(product.id);
      const grp = groupSaleMap.get(product.id);

      const best = pickBestSale([
        cat
          ? {
              source: "category" as const,
              amount: cat.amount,
              price: cat.price,
              meta: { category: cat.category },
            }
          : null,
        product.productSaleQuantity != null && product.productSalePrice != null
          ? {
              source: "product" as const,
              amount: Number(product.productSaleQuantity),
              price: Number(product.productSalePrice),
            }
          : null,
        grp?.amount && grp.price
          ? {
              source: "group" as const,
              amount: grp.amount,
              price: grp.price,
              meta: { group: grp.id, groupName: grp.name ?? null },
            }
          : null,
      ]);

      // shape expected by storefront
      let sale: {
        amount: number;
        price: number;
        fromCategory?: boolean;
        category?: { id: number; name: string };
        fromGroup?: boolean; // NEW (optional)
        group?: { id: number; name: string | null }; // NEW (optional)
      } | null = null;

      if (best) {
        sale = {
          amount: best.amount,
          price: best.price,
        };
        if (best.source === "category") {
          sale.fromCategory = true;
          sale.category = best.meta?.category;
        } else if (best.source === "group") {
          (sale as any).fromGroup = true;
          (sale as any).group = {
            id: best.meta?.group,
            name: best.meta?.groupName ?? null,
          };
        }
      }

      // always expose saleGroup for grouping UI, even if not the winning sale
      const saleGroup = grp
        ? {
            id: grp.id,
            name: grp.name ?? null,
            amount: grp.amount ?? null,
            price: grp.price ?? null,
          }
        : null;

      return {
        id: product.id,
        name: product.name,
        price: basePrice,
        image: product.image,
        inStock: product.in_stock ?? true,
        sale, // chosen / best sale
        saleGroup, // raw group info for UI clustering
        sortOrder: product.sort_order ?? 0,
      };
    });

    return NextResponse.json({ products: finalProducts }, { status: 200 });
  } catch (err) {
    console.error("❌ Error in /api/categories/name/[name]/products:", err);
    return NextResponse.json(
      { products: [], error: "Server error" },
      { status: 200 }
    );
  }
}

export const GET = withMiddleware(getProductsByCategoryName);
