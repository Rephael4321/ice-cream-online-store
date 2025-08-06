import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function getEligibleProducts(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const saleGroupId = Number(params.id);

  if (isNaN(saleGroupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.price,
        p.image,
        s.quantity AS sale_quantity,
        s.sale_price AS sale_price,
        psg.sale_group_id IS NOT NULL AS already_linked,
        psg.label,
        psg.color
      FROM products p
      LEFT JOIN sales s ON s.product_id = p.id
      LEFT JOIN product_sale_groups psg
        ON p.id = psg.product_id AND psg.sale_group_id = $1
      `,
      [saleGroupId]
    );

    const data = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      image: row.image,
      sale: row.sale_quantity
        ? {
            quantity: row.sale_quantity,
            sale_price: Number(row.sale_price),
          }
        : null,
      label: row.label,
      color: row.color,
      alreadyLinked: row.already_linked,
    }));

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch eligible products" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getEligibleProducts);
