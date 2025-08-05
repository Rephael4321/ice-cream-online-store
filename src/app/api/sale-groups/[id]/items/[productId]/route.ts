import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

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

  try {
    await pool.query(
      `DELETE FROM product_sale_groups
       WHERE sale_group_id = $1 AND product_id = $2`,
      [groupId, productId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to remove product from sale group:", error);
    return NextResponse.json(
      { error: "Failed to remove product from sale group" },
      { status: 500 }
    );
  }
}

export const DELETE = withMiddleware(removeProductFromSaleGroup);
