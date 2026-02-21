import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function getProductCategoriesMulti(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = Number(id);
  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.image, c.type, c.description
       FROM category_multi_items cmi
       JOIN categories c ON c.id = cmi.category_id
       WHERE cmi.target_type = 'product' AND cmi.target_id = $1
       ORDER BY cmi.sort_order ASC NULLS LAST`,
      [productId]
    );

    return NextResponse.json({ categories: result.rows });
  } catch (err) {
    console.error("Failed to fetch multi categories for product", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const GET = withMiddleware(getProductCategoriesMulti);
