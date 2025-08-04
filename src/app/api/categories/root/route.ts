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

    const sanitized = result.rows.map((cat) => ({
      ...cat,
      name: cat.name.replace(/-/g, " "),
    }));

    return NextResponse.json({ categories: sanitized });
  } catch (err) {
    console.error("❌ Error fetching root categories:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ Use middleware (harmless for GET, consistent for all)
export const GET = withMiddleware(getRootCategories, {
  deprecated:
    "This endpoint is going to be affected by new category items orders",
});
