import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

// Helper: works whether params is sync or a Promise
async function resolveParams<T>(p: T | Promise<T>): Promise<T> {
  return await Promise.resolve(p);
}

async function getEligibleProducts(
  _req: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id } = await resolveParams((context as any).params);
  const saleGroupId = Number(id);

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
        (psg.sale_group_id IS NOT NULL) AS already_linked
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
      price: row.price != null ? Number(row.price) : null,
      image: row.image,
      sale:
        row.sale_quantity != null && row.sale_price != null
          ? {
              quantity: Number(row.sale_quantity),
              sale_price: Number(row.sale_price),
            }
          : null,
      alreadyLinked: !!row.already_linked,
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("❌ Failed to fetch eligible products:", err);
    return NextResponse.json(
      { error: "Failed to fetch eligible products" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getEligibleProducts);
