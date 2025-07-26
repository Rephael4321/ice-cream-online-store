import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

// GET /api/categories/root → public
async function getRootCategories(_req: NextRequest) {
  try {
    const result = await pool.query(
      `SELECT id, name, image, description, type
       FROM categories
       WHERE parent_id IS NULL
       ORDER BY sort_order ASC`
    );

    return NextResponse.json({ categories: result.rows });
  } catch (err) {
    console.error("❌ Error fetching root categories:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ Use middleware (harmless for GET, consistent for all)
export const GET = withMiddleware(getRootCategories);
