import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

// ✅ PUT /api/categories/organize (admin only)
async function organizeCategories(req: NextRequest) {
  try {
    const { categoryOrder } = await req.json();

    if (!Array.isArray(categoryOrder)) {
      return NextResponse.json(
        { error: "Missing categoryOrder array" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (let i = 0; i < categoryOrder.length; i++) {
        const id = categoryOrder[i];
        await client.query(
          "UPDATE categories SET sort_order = $1, updated_at = NOW() WHERE id = $2",
          [i, id]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save category order:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ Secure with middleware
export const PUT = withMiddleware(organizeCategories, {
  deprecated:
    "This endpoint is going to be affected by new category items orders",
});
