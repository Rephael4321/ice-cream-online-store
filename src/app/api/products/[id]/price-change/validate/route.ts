import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function validatePriceChange(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const productId = Number(id);
  if (Number.isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const { price, saleQuantity, salePrice } = await req.json().catch(() => ({}));

  const client = await pool.connect();
  try {
    const { rows: gRows } = await client.query(
      `SELECT sale_group_id AS id
       FROM product_sale_groups
       WHERE product_id = $1
       LIMIT 1`,
      [productId]
    );

    if (gRows.length === 0) {
      return NextResponse.json({ inGroup: false, conflicts: null });
    }

    const groupId = gRows[0].id;

    const { rows: groupRows } = await client.query(
      `SELECT id, name, price, quantity, sale_price FROM sale_groups WHERE id = $1`,
      [groupId]
    );
    const group = groupRows[0];

    const { rows: itemRows } = await client.query(
      `SELECT p.id, p.name, p.price,
              s.quantity AS sale_quantity, s.sale_price
       FROM product_sale_groups psg
       JOIN products p ON p.id = psg.product_id
       LEFT JOIN sales s ON s.product_id = p.id
       WHERE psg.sale_group_id = $1
       ORDER BY p.id`,
      [groupId]
    );

    const priceChanged =
      typeof price === "number" &&
      group?.price !== null &&
      price !== Number(group.price);

    const saleChanged =
      (typeof saleQuantity === "number" &&
        group?.quantity !== null &&
        saleQuantity !== Number(group.quantity)) ||
      (typeof salePrice === "number" &&
        group?.sale_price !== null &&
        salePrice !== Number(group.sale_price));

    const conflicts = {
      priceChanged,
      saleChanged,
      any: Boolean(priceChanged || saleChanged),
    };

    return NextResponse.json({
      inGroup: true,
      group,
      items: itemRows,
      conflicts,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}

export const POST = withMiddleware(validatePriceChange);
