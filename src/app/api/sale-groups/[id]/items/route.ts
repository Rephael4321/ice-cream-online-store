import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function addToGroup(
  _req: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  const groupId = Number(params.id);
  const productId = Number(params.productId);

  if (isNaN(groupId) || isNaN(productId)) {
    return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Optional: enforce pricing consistency like your bulk-add route
      const groupRes = await client.query(
        `SELECT price, sale_price, quantity FROM sale_groups WHERE id = $1`,
        [groupId]
      );
      const group = groupRes.rows[0] ?? {};

      const prodRes = await client.query(
        `SELECT price FROM products WHERE id = $1`,
        [productId]
      );
      if (prodRes.rowCount === 0) {
        throw new Error(`Product not found: ${productId}`);
      }

      const saleRes = await client.query(
        `SELECT quantity, sale_price FROM sales WHERE product_id = $1`,
        [productId]
      );
      if (saleRes.rowCount === 0) {
        throw new Error(`Sale not defined for product: ${productId}`);
      }

      const productPrice = Number(prodRes.rows[0].price);
      const productSalePrice = Number(saleRes.rows[0].sale_price);
      const productSaleQty = Number(saleRes.rows[0].quantity);

      let targetPrice = group.price != null ? Number(group.price) : null;
      let targetSalePrice =
        group.sale_price != null ? Number(group.sale_price) : null;
      let targetQuantity =
        group.quantity != null ? Number(group.quantity) : null;

      if (
        targetPrice !== null &&
        (productPrice !== targetPrice ||
          productSalePrice !== targetSalePrice ||
          productSaleQty !== targetQuantity)
      ) {
        throw new Error("Product does not match group pricing");
      }

      // If group empty (no base yet), set base from this product
      if (targetPrice === null) {
        await client.query(
          `UPDATE sale_groups
           SET price = $1, sale_price = $2, quantity = $3, updated_at = now()
           WHERE id = $4`,
          [productPrice, productSalePrice, productSaleQty, groupId]
        );
      }

      await client.query(
        `INSERT INTO product_sale_groups (product_id, sale_group_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [productId, groupId]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (e: any) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: e.message }, { status: 400 });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("❌ Add to group failed:", e);
    return NextResponse.json(
      { error: "Failed to add product to group" },
      { status: 500 }
    );
  }
}

async function removeFromGroup(
  _req: NextRequest,
  { params }: { params: { id: string; productId: string } }
) {
  const groupId = Number(params.id);
  const productId = Number(params.productId);

  if (isNaN(groupId) || isNaN(productId)) {
    return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
  }

  try {
    await pool.query(
      `DELETE FROM product_sale_groups WHERE product_id = $1 AND sale_group_id = $2`,
      [productId, groupId]
    );
    // (Optional) Reset sale_groups price/sale if last product was removed — unchanged here.
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("❌ Remove from group failed:", e);
    return NextResponse.json(
      { error: "Failed to remove product from group" },
      { status: 500 }
    );
  }
}

export const POST = withMiddleware(addToGroup);
export const DELETE = withMiddleware(removeFromGroup);
