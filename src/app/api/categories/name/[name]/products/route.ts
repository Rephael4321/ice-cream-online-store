import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

type ProductRow = {
  id: number;
  name: string;
  price: number;
  image: string;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
  productSaleQuantity: number | null;
  productSalePrice: number | null;
  sort_order: number | null;
};

type CategorySaleRow = {
  productId: number;
  categoryId: number;
  categoryName: string;
  quantity: number;
  sale_price: number;
};

async function getProductsByCategoryName(
  _req: NextRequest,
  context: { params: { name: string } }
) {
  try {
    const { name } = context.params;
    const slug = decodeURIComponent(name);

    const categoryRes = await pool.query<{ id: number }>(
      `SELECT id FROM categories WHERE name = $1`,
      [slug]
    );

    if (categoryRes.rowCount === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const categoryId = categoryRes.rows[0].id;

    const result = await pool.query<ProductRow>(
      `SELECT 
         p.id, 
         p.name, 
         p.price, 
         p.image,
         p.in_stock,
         p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
         p.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,
         s.quantity AS "productSaleQuantity",
         s.sale_price AS "productSalePrice",
         mi.sort_order
       FROM category_multi_items mi
       JOIN products p ON mi.target_id = p.id
       LEFT JOIN sales s ON s.product_id = p.id
       WHERE mi.category_id = $1 AND mi.target_type = 'product'
       ORDER BY mi.sort_order ASC NULLS LAST, p.name ASC`,
      [categoryId]
    );

    const products = result.rows;
    if (!products.length) {
      return NextResponse.json({ products: [] });
    }

    const productIds = products.map((p) => p.id);
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(", ");

    const categorySalesResult = await pool.query<CategorySaleRow>(
      `SELECT 
         mi.target_id AS "productId",
         c.id AS "categoryId",
         c.name AS "categoryName",
         cs.quantity,
         cs.sale_price
       FROM category_multi_items mi
       JOIN categories c ON c.id = mi.category_id
       JOIN category_sales cs ON cs.category_id = c.id
       WHERE mi.target_type = 'product'
         AND mi.target_id IN (${placeholders})
         AND c.type = 'sale'`,
      productIds
    );

    const saleMap = new Map<
      number,
      {
        amount: number;
        price: number;
        category: { id: number; name: string };
      }
    >();

    for (const row of categorySalesResult.rows) {
      const existing = saleMap.get(row.productId);
      if (!existing || row.sale_price < existing.price) {
        saleMap.set(row.productId, {
          amount: row.quantity,
          price: row.sale_price,
          category: {
            id: row.categoryId,
            name: row.categoryName.replace(/-/g, " "),
          },
        });
      }
    }

    const finalProducts = products.map((product) => {
      const categorySale = saleMap.get(product.id);
      let sale = null;

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
          amount: product.productSaleQuantity,
          price: product.productSalePrice,
          fromCategory: false,
        };
      }

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        inStock: product.in_stock,
        created_at: product.created_at,
        updated_at: product.updated_at,
        sale,
        sort_order: product.sort_order,
      };
    });

    return NextResponse.json({ products: finalProducts });
  } catch (err) {
    console.error("❌ Error in /api/categories/name/[name]/products:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export const GET = withMiddleware(getProductsByCategoryName);
