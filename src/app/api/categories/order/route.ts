import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

async function organizeCategoryItems(req: NextRequest) {
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
        const categoryId = categoryOrder[i];

        const res = await client.query(
          `UPDATE category_multi_items
           SET sort_order = $1, updated_at = NOW()
           WHERE target_type = 'category' AND target_id = $2 AND category_id IS NULL`,
          [i, categoryId]
        );

        if (res.rowCount === 0) {
          await client.query(
            `INSERT INTO category_multi_items (
               category_id, target_type, target_id, sort_order, created_at, updated_at
             ) VALUES (
               NULL, 'category', $1, $2, NOW(), NOW()
             )`,
            [categoryId, i]
          );
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Transaction failed while saving category order:", err);
      return NextResponse.json(
        { error: "Failed to save order" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Failed to save category order:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const PUT = withMiddleware(organizeCategoryItems);
