import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

type SaleGroupProduct = {
  id: number;
  name: string;
  price: number;
  image: string | null;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
};

async function getSaleGroupProducts(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const groupId = Number(context.params.id);

  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  try {
    const result = await pool.query<SaleGroupProduct>(
      `
      SELECT p.*
      FROM products p
      INNER JOIN product_sale_groups sg ON sg.product_id = p.id
      WHERE sg.sale_group_id = $1
      ORDER BY p.created_at DESC
      `,
      [groupId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("❌ Failed to fetch group products:", error);
    return NextResponse.json(
      { error: "Failed to fetch group products" },
      { status: 500 }
    );
  }
}

async function addProductsToGroup(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const groupId = Number(context.params.id);

  if (isNaN(groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  try {
    const { productIds } = await req.json();

    if (
      !Array.isArray(productIds) ||
      productIds.some((id) => isNaN(Number(id)))
    ) {
      return NextResponse.json(
        { error: "Invalid product IDs" },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const productId of productIds) {
        await client.query(
          `
          INSERT INTO product_sale_groups (product_id, sale_group_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [productId, groupId]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Failed to add products to group:", error);
    return NextResponse.json(
      { error: "Failed to add products to group" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getSaleGroupProducts);
export const POST = withMiddleware(addProductsToGroup);
