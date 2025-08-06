import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

type AllowedTargetType = "product" | "category" | "sale_group";

type LinkPayload = {
  targetId: number;
  categoryId: number;
  type: AllowedTargetType;
};

async function linkItem(req: NextRequest) {
  try {
    const { targetId, categoryId, type }: LinkPayload = await req.json();

    if (
      !targetId ||
      !categoryId ||
      !["product", "category", "sale_group"].includes(type)
    ) {
      return NextResponse.json(
        { error: "targetId, categoryId, and valid type are required" },
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

    if (category.type === "sale" && type === "product") {
      const newProduct = await pool.query(
        "SELECT price FROM products WHERE id = $1",
        [targetId]
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
      [categoryId, type, targetId]
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
    const targetId = Number(searchParams.get("targetId"));
    const categoryId = Number(searchParams.get("categoryId"));
    const targetType = searchParams.get("type");

    if (
      !targetId ||
      !categoryId ||
      !["product", "category", "sale_group"].includes(targetType || "")
    ) {
      return NextResponse.json(
        { error: "targetId, categoryId, and valid type are required" },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM category_multi_items
       WHERE category_id = $1 AND target_type = $2 AND target_id = $3`,
      [categoryId, targetType, targetId]
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

export const POST = withMiddleware(linkItem);
export const DELETE = withMiddleware(unlinkItem);
