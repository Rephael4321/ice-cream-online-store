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

    await pool.query(
      "INSERT IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)",
      [productId, categoryId]
    );

    return NextResponse.json(
      { message: "Product linked to category" },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
