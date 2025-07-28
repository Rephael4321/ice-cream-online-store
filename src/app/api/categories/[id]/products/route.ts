import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

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
      `SELECT 
        p.id, 
        p.name, 
        p.image, 
        p.price,
        s.sale_price, 
        s.quantity AS sale_quantity,
        pc.sort_order
      FROM products p
      JOIN product_categories pc ON pc.product_id = p.id
      LEFT JOIN sales s ON s.product_id = p.id
      WHERE pc.category_id = $1
      ORDER BY pc.sort_order ASC, p.name ASC`,
      [categoryId]
    );

    const sanitizedProducts = result.rows.map((product) => ({
      ...product,
      name: product.name.replace(/-/g, " "),
    }));

    return NextResponse.json({ products: sanitizedProducts });
  } catch (err) {
    console.error("❌ Failed to fetch products:", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// ✅ Use shared middleware (safe for GET)
export const GET = withMiddleware(getCategoryProducts);
