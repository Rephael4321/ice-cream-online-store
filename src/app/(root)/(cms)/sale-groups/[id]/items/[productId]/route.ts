// app/api/sale-groups/[id]/items/[productId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

// POST: Link or update product in sale group with label/color
async function linkProductToSaleGroup(
  req: NextRequest,
  context: { params: { id: string; productId: string } }
) {
  const saleGroupId = Number(context.params.id);
  const productId = Number(context.params.productId);

  if (isNaN(saleGroupId) || isNaN(productId)) {
    return NextResponse.json({ error: "Invalid ID(s)" }, { status: 400 });
  }

  try {
    const { label, color } = await req.json();

    await pool.query(
      `
      INSERT INTO product_sale_groups (product_id, sale_group_id, label, color)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (product_id, sale_group_id)
      DO UPDATE SET label = $3, color = $4, updated_at = now()
      `,
      [productId, saleGroupId, label || null, color || null]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to link product to sale group:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Unlink product from sale group
async function removeProductFromSaleGroup(
  _req: NextRequest,
  context: { params: { id: string; productId: string } }
) {
  const saleGroupId = Number(context.params.id);
  const productId = Number(context.params.productId);

  if (isNaN(saleGroupId) || isNaN(productId)) {
    return NextResponse.json({ error: "Invalid ID(s)" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      DELETE FROM product_sale_groups
      WHERE sale_group_id = $1 AND product_id = $2
      `,
      [saleGroupId, productId]
    );

    return NextResponse.json({ success: (result.rowCount ?? 0) > 0 });
  } catch (err) {
    console.error("❌ Failed to remove product from sale group:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = withMiddleware(linkProductToSaleGroup);
export const DELETE = withMiddleware(removeProductFromSaleGroup);
