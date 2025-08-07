import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function orderCategoryNewSchema(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const categoryId = Number(params.id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  try {
    const { order } = await req.json();

    if (
      !Array.isArray(order) ||
      !order.every(
        (item) =>
          typeof item === "object" &&
          typeof item.id === "number" &&
          (item.type === "product" || item.type === "sale_group")
      )
    ) {
      return NextResponse.json(
        { error: "Invalid order format" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (let index = 0; index < order.length; index++) {
        const { id, type } = order[index];

        await client.query(
          `
          UPDATE category_multi_items
          SET sort_order = $1
          WHERE category_id = $2 AND target_type = $3 AND target_id = $4
          `,
          [index, categoryId, type, id]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Failed to update item order:", err);
      return NextResponse.json(
        { error: "Failed to update item order" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Invalid request body:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export const PUT = withMiddleware(orderCategoryNewSchema);
