// src/app/api/product-category/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { productId, categoryId } = await req.json();

    if (!productId || !categoryId) {
      return NextResponse.json(
        { error: "Both productId and categoryId are required" },
        { status: 400 }
      );
    }

    // Step 1: Check if the category is a sale category
    const [[category]]: any = await pool.query(
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
      const [[newProduct]]: any = await pool.query(
        "SELECT price FROM products WHERE id = ?",
        [productId]
      );

      if (!newProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Step 3: Get one existing product in the category to compare price
      const [[existing]]: any = await pool.query(
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
    await pool.query(
      "INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)",
      [productId, categoryId]
    );

    return NextResponse.json(
      { message: "Product linked to category" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error linking product to category:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
