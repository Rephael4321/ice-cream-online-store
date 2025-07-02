import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db.neon";

// DB types
type ProductRow = {
  id: number;
  name: string;
  price: number;
  image: string;
  productSaleQuantity: number | null;
  productSalePrice: number | null;
};

type CategorySaleRow = {
  productId: number;
  categoryId: number;
  categoryName: string;
  quantity: number;
  sale_price: number;
};

export async function GET(
  _req: NextRequest,
  context: { params: { name: string } }
) {
  try {
    const { name } = context.params;
    console.log(">>>> CATEGORY NAME PARAM:", name);

    // 1. Fetch products in this category
    const result = await pool.query<ProductRow>(
      `SELECT 
         p.id, p.name, p.price, p.image,
         s.quantity AS "productSaleQuantity",
         s.sale_price AS "productSalePrice"
       FROM products p
       JOIN product_categories pc ON pc.product_id = p.id
       JOIN categories c          ON c.id = pc.category_id
       LEFT JOIN sales s          ON s.product_id = p.id
       WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER($1)`,
      [name]
    );

    const products = result.rows;
    if (!products.length) {
      return NextResponse.json({ products: [] });
    }

    // 2. Prepare category sales data
    const productIds = products.map((p) => p.id);
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(", ");
    const queryParams = productIds;

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
      queryParams
    );

    const categorySales = categorySalesResult.rows;

    // 3. Map sales per product
    const saleMap = new Map<
      number,
      {
        amount: number;
        price: number;
        category: { id: number; name: string };
      }
    >();

    for (const row of categorySales) {
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

    // 4. Final product response
    const finalProducts = products.map((product) => {
      let sale;

      const categorySale = saleMap.get(product.id);
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
        sale,
      };
    });

    return NextResponse.json({ products: finalProducts });
  } catch (err: unknown) {
    console.error("Error in /api/categories/name/[name]/products:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}
