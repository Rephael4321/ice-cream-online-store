import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function getLinkedCategories(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get("type");
  const targetId = Number(searchParams.get("targetId"));

  if (
    !targetType ||
    !["product", "sale_group", "category"].includes(targetType)
  ) {
    return NextResponse.json(
      { error: "Invalid or missing 'type'" },
      { status: 400 }
    );
  }

  if (!targetId || isNaN(targetId)) {
    return NextResponse.json(
      { error: "Invalid or missing 'targetId'" },
      { status: 400 }
    );
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.image, c.description, c.type
       FROM category_multi_items cmi
       JOIN categories c ON c.id = cmi.category_id
       WHERE cmi.target_type = $1 AND cmi.target_id = $2
       ORDER BY c.sort_order ASC`,
      [targetType, targetId]
    );

    return NextResponse.json({ categories: result.rows });
  } catch (err: any) {
    console.error("❌ Error fetching linked categories:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getLinkedCategories);
