import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

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

      const existing = await client.query(
        `
        SELECT p.price
        FROM products p
        INNER JOIN product_sale_groups sg ON sg.product_id = p.id
        WHERE sg.sale_group_id = $1
        LIMIT 1
        `,
        [groupId]
      );

      let targetPrice: number | null = null;
      if ((existing.rowCount ?? 0) > 0) {
        targetPrice = Number(existing.rows[0].price);
      }

      for (const productId of productIds) {
        const res = await client.query(
          `SELECT price FROM products WHERE id = $1`,
          [productId]
        );
        if (res.rowCount === 0) {
          throw new Error(`Product not found: ${productId}`);
        }

        const productPrice = Number(res.rows[0].price);

        if (targetPrice !== null && productPrice !== targetPrice) {
          throw new Error(
            `Product ${productId} does not match group price (${productPrice} ≠ ${targetPrice})`
          );
        }

        if (targetPrice === null) {
          await client.query(
            `
            UPDATE sale_groups
            SET quantity = 1,
                sale_price = $1
            WHERE id = $2
            `,
            [productPrice, groupId]
          );
          targetPrice = productPrice;
        }

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
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("❌ Add products failed:", err);
      return NextResponse.json({ error: err.message }, { status: 400 });
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
