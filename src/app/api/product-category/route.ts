import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket, OkPacket } from "mysql2";

// Request body type
type LinkProductToCategoryPayload = {
  productId: number;
  categoryId: number;
};

// Result row types
type CategoryRow = {
  type: "collection" | "sale";
};

type ProductPriceRow = {
  price: number;
};

export async function POST(req: NextRequest) {
  try {
    const { productId, categoryId }: LinkProductToCategoryPayload =
      await req.json();

    if (!productId || !categoryId) {
      return NextResponse.json(
        { error: "Both productId and categoryId are required" },
        { status: 400 }
      );
    }

    // Step 1: Check if the category is a sale category
    const [[category]] = await pool.query<CategoryRow[] & RowDataPacket[]>(
      "SELECT type FROM categories WHERE id = ?",
      [categoryId]
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (category.type === "sale") {
      // Step 2: Get the price of the new product
      const [[newProduct]] = await pool.query<
        ProductPriceRow[] & RowDataPacket[]
      >("SELECT price FROM products WHERE id = ?", [productId]);

      if (!newProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Step 3: Get one existing product in the category to compare price
      const [[existing]] = await pool.query<
        ProductPriceRow[] & RowDataPacket[]
      >(
        `SELECT p.price
         FROM products p
         JOIN product_categories pc ON pc.product_id = p.id
         WHERE pc.category_id = ?
         LIMIT 1`,
        [categoryId]
      );

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

    // Step 4: Perform the insert
    await pool.query<OkPacket>(
      "INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)",
      [productId, categoryId]
    );

    return NextResponse.json(
      { message: "Product linked to category" },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Error linking product to category:", err);
    const error =
      err instanceof Error ? err.message : "Failed to link product to category";
    return NextResponse.json({ error }, { status: 500 });
  }
}
