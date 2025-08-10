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

async function getProductsByCategoryName(
  _req: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await context.params;
    const slug = decodeURIComponent(name);

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
    let saleMap = new Map<
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

      saleMap = new Map();
      for (const row of categorySalesResult.rows) {
        const priceNum =
          row.sale_price != null ? Number(row.sale_price) : undefined;
        const existing = saleMap.get(row.productId);
        if (
          !existing ||
          (priceNum !== undefined && priceNum < existing.price)
        ) {
          saleMap.set(row.productId, {
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

    const finalProducts = products.map((product) => {
      const categorySale = saleMap.get(product.id);

      let sale: {
        amount: number;
        price: number;
        fromCategory: boolean;
        category?: { id: number; name: string };
      } | null = null;

      if (categorySale) {
        sale = {
          amount: categorySale.amount,
          price: categorySale.price,
          fromCategory: true,
          category: categorySale.category,
        };
      } else if (
        product.productSaleQuantity != null &&
        product.productSalePrice != null
      ) {
        sale = {
          amount: Number(product.productSaleQuantity),
          price: Number(product.productSalePrice),
          fromCategory: false,
        };
      }

      return {
        id: product.id,
        name: product.name,
        price: product.price != null ? Number(product.price) : null,
        image: product.image,
        inStock: product.in_stock ?? true,
        sale,
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
