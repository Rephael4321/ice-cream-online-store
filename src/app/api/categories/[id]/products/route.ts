import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function getCategoryProducts(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const categoryId = Number(params.id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        p.id, 
        p.name, 
        p.image, 
        p.price,
        cs.sale_price, 
        cs.quantity AS sale_quantity,
        cmi.sort_order
      FROM category_multi_items cmi
      JOIN products p ON cmi.target_id = p.id
      LEFT JOIN category_sales cs ON cs.category_id = cmi.category_id
      WHERE cmi.category_id = $1
        AND cmi.target_type = 'product'
      ORDER BY cmi.sort_order ASC, p.name ASC
      `,
      [categoryId]
    );

    const sanitizedProducts = result.rows.map((product) => ({
      ...product,
      name: product.name.replace(/-/g, " "),
    }));

    return NextResponse.json({ products: sanitizedProducts });
  } catch (err) {
    console.error("❌ Failed to fetch products (new schema):", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getCategoryProducts);
