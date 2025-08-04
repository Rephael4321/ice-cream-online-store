import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

async function getProductCategories(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const productId = Number(params.id);
  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.image
       FROM categories c
       JOIN product_categories pc ON pc.category_id = c.id
       WHERE pc.product_id = $1`,
      [productId]
    );

    return NextResponse.json({ categories: result.rows });
  } catch (err) {
    console.error("Failed to fetch categories for product", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const GET = withMiddleware(getProductCategories, {
  deprecated:
    "This endpoint is going to be affected by new category items orders",
});
