import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

// === Types ===
type LinkProductToCategoryPayload = {
  productId: number;
  categoryId: number;
};

type CategoryRow = {
  type: "collection" | "sale";
};

type ProductPriceRow = {
  price: number;
};

// === Admin check ===
async function isAdmin(): Promise<boolean> {
  try {
    const cookie = cookies();
    const token = (await cookie).get("token")?.value;
    if (!token) return false;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return (
      typeof decoded === "object" &&
      ("role" in decoded ? decoded.role === "admin" : decoded.id === "admin")
    );
  } catch {
    return false;
  }
}

// === POST /api/products/categories (🔐 admin only) ===
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { productId, categoryId }: LinkProductToCategoryPayload =
      await req.json();

    if (!productId || !categoryId) {
      return NextResponse.json(
        { error: "Both productId and categoryId are required" },
        { status: 400 }
      );
    }

    // Step 1: Check category type
    const categoryResult = await pool.query<CategoryRow>(
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

    if (category.type === "sale") {
      // Step 2: Get new product price
      const productResult = await pool.query<ProductPriceRow>(
        "SELECT price FROM products WHERE id = $1",
        [productId]
      );
      const newProduct = productResult.rows[0];
      if (!newProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Step 3: Compare with existing products
      const existingResult = await pool.query<ProductPriceRow>(
        `SELECT p.price
         FROM products p
         JOIN product_categories pc ON pc.product_id = p.id
         WHERE pc.category_id = $1
         LIMIT 1`,
        [categoryId]
      );
      const existing = existingResult.rows[0];

      if (existing && existing.price !== newProduct.price) {
        return NextResponse.json(
          {
            error:
              "Cannot add product with a different price to a sale category. All products must have the same price.",
          },
          { status: 400 }
        );
      }
    }

    // Step 4: Insert with incremental sort_order
    await pool.query(
      `INSERT INTO product_categories (product_id, category_id, sort_order)
       SELECT $1, $2, COALESCE(MAX(sort_order), -1) + 1
       FROM product_categories
       WHERE category_id = $2
       ON CONFLICT (product_id, category_id) DO NOTHING`,
      [productId, categoryId]
    );

    return NextResponse.json(
      { message: "Product linked to category" },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("❌ Error linking product to category:", err);
    const error =
      err instanceof Error ? err.message : "Failed to link product to category";
    return NextResponse.json({ error }, { status: 500 });
  }
}

// === DELETE /api/products/categories (🔐 admin only) ===
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const productId = Number(searchParams.get("productId"));
    const categoryId = Number(searchParams.get("categoryId"));

    if (!productId || !categoryId) {
      return NextResponse.json(
        { error: "Missing productId or categoryId" },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM product_categories WHERE product_id = $1 AND category_id = $2`,
      [productId, categoryId]
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("❌ Error unlinking product from category:", err);
    const error =
      err instanceof Error
        ? err.message
        : "Failed to unlink product from category";
    return NextResponse.json({ error }, { status: 500 });
  }
}
