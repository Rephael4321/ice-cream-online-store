// src/app/api/categories/name/[name]/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;

    const [products]: any = await pool.query(
      `SELECT 
         p.id, p.name, p.price, p.image,
         s.quantity AS productSaleQuantity,
         s.sale_price AS productSalePrice
       FROM products p
       JOIN product_categories pc ON pc.product_id = p.id
       JOIN categories c          ON c.id = pc.category_id
       LEFT JOIN sales s          ON s.product_id = p.id
       WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER(?)`,
      [name]
    );

    if (!products.length) {
      return NextResponse.json({ products: [] });
    }

    // Extract all product IDs
    const productIds = products.map((p: any) => p.id);

    // Get all category sales linked to these products
    const [categorySales]: any = await pool.query(
      `SELECT 
         pc.product_id AS productId,
         c.id AS categoryId,
         c.name AS categoryName,
         cs.quantity,
         cs.sale_price
       FROM product_categories pc
       JOIN categories c ON c.id = pc.category_id
       JOIN category_sales cs ON cs.category_id = c.id
       WHERE c.type = 'sale' AND pc.product_id IN (?)`,
      [productIds]
    );

    // Organize category sale entries by productId
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
      if (
        !existing ||
        row.sale_price < existing.price // prioritize lower price
      ) {
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

    const finalProducts = products.map((product: any) => {
      let sale = undefined;

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
  } catch (err: any) {
    console.error("Error in /api/categories/name/[name]/products:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
