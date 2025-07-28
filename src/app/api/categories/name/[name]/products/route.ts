import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

type ProductRow = {
  id: number;
  name: string;
  price: number;
  image: string;
  in_stock: boolean; // ✅ added
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
    const slug = decodeURIComponent(name); // e.g. 'חלב-מיוחדים'

    // Step 0: Get category ID by exact match (slugified)
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

    // Step 1: Fetch products in the category (include in_stock!)
    const result = await pool.query<ProductRow>(
      `SELECT 
         p.id, 
         p.name, 
         p.price, 
         p.image,
         p.in_stock, -- ✅ add in_stock field
         p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
         p.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,
         s.quantity AS "productSaleQuantity",
         s.sale_price AS "productSalePrice",
         pc.sort_order
       FROM products p
       JOIN product_categories pc ON pc.product_id = p.id
       LEFT JOIN sales s ON s.product_id = p.id
       WHERE pc.category_id = $1
       ORDER BY pc.sort_order ASC NULLS LAST, p.name ASC`,
      [categoryId]
    );

    const products = result.rows;
    if (!products.length) {
      return NextResponse.json({ products: [] });
    }

    // Step 2: Fetch sale prices from category_sales
    const productIds = products.map((p) => p.id);
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(", ");

    const categorySalesResult = await pool.query<CategorySaleRow>(
      `SELECT 
         pc.product_id AS "productId",
         c.id AS "categoryId",
         c.name AS "categoryName",
         cs.quantity,
         cs.sale_price
       FROM product_categories pc
       JOIN categories c ON c.id = pc.category_id
       JOIN category_sales cs ON cs.category_id = c.id
       WHERE c.type = 'sale' AND pc.product_id IN (${placeholders})`,
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
            name: row.categoryName,
          },
        });
      }
    }

    // Step 3: Build final product list
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
        inStock: product.in_stock, // ✅ return inStock
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

// ✅ Wrap with middleware (even if public GET)
export const GET = withMiddleware(getProductsByCategoryName);
