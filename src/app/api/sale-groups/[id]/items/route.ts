import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function listItemsInGroup(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const groupId = Number(idParam);

  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      SELECT p.id, p.name, p.price, p.image, p.created_at, p.updated_at
      FROM product_sale_groups psg
      JOIN products p ON p.id = psg.product_id
      WHERE psg.sale_group_id = $1
      ORDER BY p.name
      `,
      [groupId]
    );

    const data = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price != null ? Number(row.price) : null,
      image: row.image,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json(data);
  } catch (e) {
    console.error("❌ List items in group failed:", e);
    return NextResponse.json(
      { error: "Failed to list products in group" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(listItemsInGroup);
