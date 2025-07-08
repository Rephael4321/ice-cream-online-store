import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// GET /api/categories/name/[name]/children
export async function GET(
  _req: NextRequest,
  context: { params: { name: string } }
) {
  try {
    const { name } = await context.params;
    const slug = decodeURIComponent(name); // e.g. "ללא-גלוטן"

    // Step 1: Get category ID by matching the slugified name
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

    // Step 2: Get children of the category
    const childrenRes = await pool.query(
      `SELECT id, name, image, description, type 
       FROM categories 
       WHERE parent_id = $1`,
      [categoryId]
    );

    return NextResponse.json({ children: childrenRes.rows });
  } catch (err) {
    console.error("❌ Error fetching children:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
