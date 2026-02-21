// src/app/api/sale-groups/[id]/items/[productId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

function eqMoney(a: number, b: number) {
  return Number(Number(a).toFixed(2)) === Number(Number(b).toFixed(2));
}

async function addProductToSaleGroup(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const { id: idStr, productId: productIdStr } = await params;
  const groupId = Number(idStr);
  const productId = Number(productIdStr);

  if (isNaN(groupId) || isNaN(productId)) {
    return NextResponse.json(
      { error: "Invalid sale group or product ID" },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch group base (may be nulls if empty)
    const groupRes = await client.query(
      `SELECT quantity, sale_price, price FROM sale_groups WHERE id = $1`,
      [groupId]
    );
    const group = groupRes.rows[0] ?? {};

    // Product unit price
    const prodPriceRes = await client.query<{ price: number }>(
      `SELECT price FROM products WHERE id = $1`,
      [productId]
    );
    if (prodPriceRes.rowCount === 0) {
      throw new Error(`Product not found: ${productId}`);
    }
    const productBasePrice = Number(prodPriceRes.rows[0].price);

    // Product sale data
    const saleRes = await client.query(
      `SELECT quantity, sale_price FROM sales WHERE product_id = $1`,
      [productId]
    );
    if (saleRes.rowCount === 0) {
      throw new Error(`Sale not defined for product: ${productId}`);
    }
    const productSaleQty = Number(saleRes.rows[0].quantity);
    const productSalePrice = Number(saleRes.rows[0].sale_price);

    const hasBase =
      group?.price != null &&
      group?.sale_price != null &&
      group?.quantity != null;

    if (!hasBase) {
      // First product sets the base
      await client.query(
        `UPDATE sale_groups
         SET quantity = $1, sale_price = $2, price = $3, updated_at = now()
         WHERE id = $4`,
        [productSaleQty, productSalePrice, productBasePrice, groupId]
      );
    } else {
      // Enforce exact match with existing base (price, sale_price, quantity)
      const groupQty = Number(group.quantity);
      const groupSalePrice = Number(group.sale_price);
      const groupBasePrice = Number(group.price);

      const qtyOk = groupQty === productSaleQty;
      const saleOk = eqMoney(groupSalePrice, productSalePrice);
      const priceOk = eqMoney(groupBasePrice, productBasePrice);

      if (!(qtyOk && saleOk && priceOk)) {
        throw new Error("Product does not match group pricing");
      }
    }

    // Link product (ignore label/color; keep columns in DB untouched)
    await client.query(
      `INSERT INTO product_sale_groups (product_id, sale_group_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [productId, groupId]
    );

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { error: error?.message ?? "Failed to add product to sale group" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

async function removeProductFromSaleGroup(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const { id: idStr, productId: productIdStr } = await params;
  const groupId = Number(idStr);
  const productId = Number(productIdStr);

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

    // If last product removed → reset base (keeps your previous behavior)
    const remaining = await client.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count
       FROM product_sale_groups
       WHERE sale_group_id = $1`,
      [groupId]
    );
    if (Number(remaining.rows[0]?.count ?? 0) === 0) {
      await client.query(
        `UPDATE sale_groups
         SET quantity = NULL, sale_price = NULL, price = NULL, updated_at = now()
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
