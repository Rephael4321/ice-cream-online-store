import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

async function getCategoryChildren(
  _req: NextRequest,
  context: { params: { name: string } }
) {
  try {
    const { name } = context.params;
    const slug = decodeURIComponent(name);

    const categoryRes = await pool.query<{ id: number }>(
      `SELECT id FROM categories 
       WHERE LOWER(REPLACE(name, ' ', '-')) = LOWER($1)`,
      [slug]
    );

    if (categoryRes.rowCount === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const categoryId = categoryRes.rows[0].id;

    const childrenRes = await pool.query(
      `
      SELECT c.id, c.name, c.image, c.description, c.type, mi.sort_order
      FROM category_multi_items mi
      JOIN categories c ON mi.target_id = c.id
      WHERE mi.category_id = $1 AND mi.target_type = 'category'
      ORDER BY mi.sort_order ASC
      `,
      [categoryId]
    );

    const sanitizedChildren = childrenRes.rows.map((child) => ({
      ...child,
      name: child.name.replace(/-/g, " "),
    }));

    return NextResponse.json({ children: sanitizedChildren });
  } catch (err) {
    console.error("❌ Error fetching children:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getCategoryChildren);
