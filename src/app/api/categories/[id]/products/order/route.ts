import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const categoryId = Number(params.id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  try {
    const { productOrder } = await req.json();

    if (!Array.isArray(productOrder)) {
      return NextResponse.json(
        { error: "Invalid product order" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (let index = 0; index < productOrder.length; index++) {
        const productId = productOrder[index];
        await client.query(
          `UPDATE product_categories
           SET sort_order = $1
           WHERE category_id = $2 AND product_id = $3`,
          [index, categoryId, productId]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Failed to update product order:", err);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Invalid request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
