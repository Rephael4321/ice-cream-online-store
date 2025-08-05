import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function removeProductFromSaleGroup(
  _req: NextRequest,
  context: { params: { id: string; productId: string } }
) {
  const groupId = Number(context.params.id);
  const productId = Number(context.params.productId);

  if (isNaN(groupId) || isNaN(productId)) {
    return NextResponse.json(
      { error: "Invalid sale group or product ID" },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM product_sale_groups
       WHERE sale_group_id = $1 AND product_id = $2`,
      [groupId, productId]
    );

    const remaining = await client.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count
       FROM product_sale_groups
       WHERE sale_group_id = $1`,
      [groupId]
    );

    const remainingCount = Number(remaining.rows[0]?.count ?? 0);

    if (remainingCount === 0) {
      await client.query(
        `UPDATE sale_groups
         SET quantity = NULL, sale_price = NULL
         WHERE id = $1`,
        [groupId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to remove product from sale group:", error);
    return NextResponse.json(
      { error: "Failed to remove product from sale group" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const DELETE = withMiddleware(removeProductFromSaleGroup);
