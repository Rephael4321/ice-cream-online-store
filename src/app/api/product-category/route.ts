import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

type LinkPayload = {
  productId: number;
  categoryId: number;
  type?: "product" | "category";
};

async function linkItem(req: NextRequest) {
  try {
    const { productId, categoryId, type }: LinkPayload = await req.json();

    if (!productId || !categoryId) {
      return NextResponse.json(
        { error: "Both productId and categoryId are required" },
        { status: 400 }
      );
    }

    const targetType: "product" | "category" =
      type ?? (await inferTargetType(productId)) ?? "product";

    if (!["product", "category"].includes(targetType)) {
      return NextResponse.json(
        { error: "Invalid target type" },
        { status: 400 }
      );
    }

    const categoryResult = await pool.query(
      "SELECT type FROM categories WHERE id = $1",
      [categoryId]
    );
    const category = categoryResult.rows[0];

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (category.type === "sale" && targetType === "product") {
      const newProduct = await pool.query(
        "SELECT price FROM products WHERE id = $1",
        [productId]
      );
      if (!newProduct.rows.length) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      const existing = await pool.query(
        `SELECT p.price
         FROM category_multi_items cmi
         JOIN products p ON p.id = cmi.target_id
         WHERE cmi.category_id = $1 AND cmi.target_type = 'product'
         LIMIT 1`,
        [categoryId]
      );

      const existingPrice = existing.rows[0]?.price;
      const newPrice = newProduct.rows[0].price;

      if (existingPrice !== undefined && existingPrice !== newPrice) {
        return NextResponse.json(
          {
            error: "All products in a sale category must have the same price.",
          },
          { status: 400 }
        );
      }
    }

    await pool.query(
      `INSERT INTO category_multi_items (category_id, target_type, target_id, sort_order)
       SELECT $1, $2, $3, COALESCE(MAX(sort_order), -1) + 1
       FROM category_multi_items
       WHERE category_id = $1
       ON CONFLICT DO NOTHING`,
      [categoryId, targetType, productId]
    );

    return NextResponse.json({ message: "Item linked" }, { status: 201 });
  } catch (err: any) {
    console.error("❌ Error linking item:", err);
    return NextResponse.json(
      { error: err.message || "Failed to link item" },
      { status: 500 }
    );
  }
}

async function unlinkItem(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = Number(searchParams.get("productId"));
    const categoryId = Number(searchParams.get("categoryId"));
    const targetType = searchParams.get("type") ?? "product";

    if (
      !productId ||
      !categoryId ||
      !["product", "category"].includes(targetType)
    ) {
      return NextResponse.json(
        { error: "Missing or invalid parameters" },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM category_multi_items
       WHERE category_id = $1 AND target_type = $2 AND target_id = $3`,
      [categoryId, targetType, productId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error unlinking item:", err);
    return NextResponse.json(
      { error: err.message || "Failed to unlink item" },
      { status: 500 }
    );
  }
}

async function inferTargetType(
  id: number
): Promise<"product" | "category" | null> {
  const product = await pool.query(
    "SELECT 1 FROM products WHERE id = $1 LIMIT 1",
    [id]
  );
  if (product.rowCount) return "product";

  const category = await pool.query(
    "SELECT 1 FROM categories WHERE id = $1 LIMIT 1",
    [id]
  );
  if (category.rowCount) return "category";

  return null;
}

export const POST = withMiddleware(linkItem);
export const DELETE = withMiddleware(unlinkItem);
