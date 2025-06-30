// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await pool.query(
      "SELECT id, name, type, image FROM categories"
    );
    return NextResponse.json({ categories: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, type, image, saleQuantity, salePrice } = await req.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    const [result]: any = await pool.query(
      "INSERT INTO categories (name, type, image) VALUES (?, ?, ?)",
      [name, type, image]
    );

    const categoryId = result.insertId;

    if (type === "sale") {
      const quantity = Number(saleQuantity);
      const price = Number(salePrice);

      const isValidQuantity = !isNaN(quantity) && quantity > 0;
      const isValidSalePrice = !isNaN(price) && price >= 0;

      if (!isValidQuantity || !isValidSalePrice) {
        return NextResponse.json(
          {
            error:
              "Valid saleQuantity and salePrice are required for sale category",
          },
          { status: 400 }
        );
      }

      await pool.query(
        "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES (?, ?, ?)",
        [categoryId, quantity, price]
      );
    }

    return NextResponse.json(
      { message: "Category added", categoryId },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
