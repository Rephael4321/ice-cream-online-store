import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const categoryName = decodeURIComponent(params.name);

  try {
    // Step 1: Get category ID by name
    const categoryRes = await pool.query<{ id: number }>(
      "SELECT id FROM categories WHERE name = $1",
      [categoryName]
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
