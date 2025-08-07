import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function addProductToSaleGroup(
  req: NextRequest,
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

  const { label, color } = await req.json();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const groupRes = await client.query(
      `SELECT quantity, sale_price, price FROM sale_groups WHERE id = $1`,
      [groupId]
    );
    const group = groupRes.rows[0];

    const productPriceRes = await client.query<{ price: number }>(
      `SELECT price FROM products WHERE id = $1`,
      [productId]
    );
    const productBasePrice = productPriceRes.rows[0]?.price;

    const productRes = await client.query(
      `SELECT quantity AS sale_quantity, sale_price
       FROM sales
       WHERE product_id = $1`,
      [productId]
    );
    const product = productRes.rows[0];

    if (!product || productBasePrice == null) {
      throw new Error("Sale or price info not found for product");
    }

    const { sale_quantity, sale_price } = product;

    if (
      group?.sale_price == null ||
      group?.quantity == null ||
      group?.price == null
    ) {
      // First product sets the group's pricing info
      await client.query(
        `UPDATE sale_groups
         SET quantity = $1, sale_price = $2, price = $3
         WHERE id = $4`,
        [sale_quantity, sale_price, productBasePrice, groupId]
      );
    } else {
      const groupQuantity = Number(group.quantity);
      const groupSalePrice = Number(group.sale_price);
      const groupBasePrice = Number(group.price);

      const saleMatches =
        groupQuantity === Number(sale_quantity) &&
        Number(groupSalePrice.toFixed(2)) ===
          Number(Number(sale_price).toFixed(2));

      const unitPriceMatches =
        Number(groupBasePrice.toFixed(2)) ===
        Number(Number(productBasePrice).toFixed(2));

      if (!saleMatches && !unitPriceMatches) {
        throw new Error(
          "❌ המחיר או פרטי המבצע של המוצר אינם תואמים את הקבוצה"
        );
      }
    }

    await client.query(
      `INSERT INTO product_sale_groups (product_id, sale_group_id, label, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, sale_group_id)
       DO UPDATE SET label = EXCLUDED.label, color = EXCLUDED.color`,
      [productId, groupId, label || null, color || null]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: error.message || "Failed to add product to sale group" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

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
         SET quantity = NULL, sale_price = NULL, price = NULL
         WHERE id = $1`,
        [groupId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: "Failed to remove product from sale group" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const POST = withMiddleware(addProductToSaleGroup);
export const DELETE = withMiddleware(removeProductFromSaleGroup);
