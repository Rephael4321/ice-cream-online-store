import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

type Body = {
  mode: "detach" | "propagate";
  price?: number | null;
  saleQuantity?: number | null;
  salePrice?: number | null;
};

async function handler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const productId = Number(params.id);
  if (Number.isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const { mode, price, saleQuantity, salePrice } = (await req.json()) as Body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: gRows } = await client.query(
      `SELECT sale_group_id FROM product_sale_groups WHERE product_id = $1 LIMIT 1`,
      [productId]
    );
    const groupId: number | null = gRows[0]?.sale_group_id ?? null;

    // Not in a group → normal single update
    if (!groupId) {
      await updateSingleProduct(
        client,
        productId,
        price,
        saleQuantity,
        salePrice
      );
      await client.query("COMMIT");
      return NextResponse.json({ ok: true, did: "single-update" });
    }

    if (mode === "detach") {
      await client.query(
        `DELETE FROM product_sale_groups WHERE product_id = $1 AND sale_group_id = $2`,
        [productId, groupId]
      );
      await updateSingleProduct(
        client,
        productId,
        price,
        saleQuantity,
        salePrice
      );
      await client.query("COMMIT");
      return NextResponse.json({ ok: true, did: "detached-and-updated" });
    }

    if (mode === "propagate") {
      // all members
      const { rows: items } = await client.query<{ id: number }>(
        `SELECT product_id AS id FROM product_sale_groups WHERE sale_group_id = $1`,
        [groupId]
      );

      // update group row
      if (typeof price === "number" || price === null) {
        await client.query(
          `UPDATE sale_groups SET price = $1, updated_at = now() WHERE id = $2`,
          [price, groupId]
        );
      }
      if (
        typeof saleQuantity === "number" ||
        saleQuantity === null ||
        typeof salePrice === "number" ||
        salePrice === null
      ) {
        await client.query(
          `UPDATE sale_groups
             SET quantity = COALESCE($1, quantity),
                 sale_price = COALESCE($2, sale_price),
                 updated_at = now()
           WHERE id = $3`,
          [saleQuantity, salePrice, groupId]
        );
      }

      // update all products + their sales
      for (const it of items) {
        await updateSingleProduct(
          client,
          it.id,
          price,
          saleQuantity,
          salePrice
        );
      }

      // update category_sales for categories that contain this sale group
      if (
        typeof saleQuantity === "number" ||
        typeof salePrice === "number" ||
        (saleQuantity === null && salePrice === null)
      ) {
        const { rows: catRows } = await client.query<{ category_id: number }>(
          `SELECT category_id
           FROM category_multi_items
           WHERE target_type = 'sale_group' AND target_id = $1`,
          [groupId]
        );
        for (const { category_id } of catRows) {
          await upsertCategorySale(
            client,
            category_id,
            saleQuantity ?? null,
            salePrice ?? null
          );
        }
      }

      await client.query("COMMIT");
      return NextResponse.json({ ok: true, did: "propagated" });
    }

    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}

// --- helpers ---

async function updateSingleProduct(
  client: any,
  productId: number,
  price?: number | null,
  saleQuantity?: number | null,
  salePrice?: number | null
) {
  if (typeof price === "number" || price === null) {
    await client.query(
      `UPDATE products SET price = $1, updated_at = now() WHERE id = $2`,
      [price, productId]
    );
  }

  // if neither provided, skip sale touch
  if (saleQuantity === undefined && salePrice === undefined) return;

  // clear sale when both null
  if (saleQuantity === null && salePrice === null) {
    await client.query(`DELETE FROM sales WHERE product_id = $1`, [productId]);
    return;
  }

  // upsert sales
  const { rowCount } = await client.query(
    `UPDATE sales SET quantity = $1, sale_price = $2, updated_at = now() WHERE product_id = $3`,
    [saleQuantity ?? null, salePrice ?? null, productId]
  );
  if (rowCount === 0) {
    await client.query(
      `INSERT INTO sales (product_id, quantity, sale_price) VALUES ($1, $2, $3)`,
      [productId, saleQuantity ?? null, salePrice ?? null]
    );
  }
}

async function upsertCategorySale(
  client: any,
  categoryId: number,
  qty: number | null,
  price: number | null
) {
  if (qty === null && price === null) {
    await client.query(`DELETE FROM category_sales WHERE category_id = $1`, [
      categoryId,
    ]);
    return;
  }

  const { rowCount } = await client.query(
    `UPDATE category_sales SET quantity = $1, sale_price = $2, updated_at = now() WHERE category_id = $3`,
    [qty, price, categoryId]
  );
  if (rowCount === 0) {
    await client.query(
      `INSERT INTO category_sales (category_id, quantity, sale_price) VALUES ($1, $2, $3)`,
      [categoryId, qty, price]
    );
  }
}

export const PUT = withMiddleware(handler);
