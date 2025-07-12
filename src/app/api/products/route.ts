import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type ProductRow = {
  id: number;
  name: string;
  price: number;
  image: string;
  created_at: string;
  updated_at: string;
  saleQuantity: number | null;
  salePrice: number | null;
  saleUpdatedAt: string | null;
};

// GET /api/products
export async function GET() {
  try {
    const result = await pool.query<ProductRow>(
      `SELECT 
         p.id, 
         p.name, 
         p.price, 
         p.image, 
         p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
         p.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,
         s.quantity AS "saleQuantity", 
         s.sale_price AS "salePrice",
         s.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "saleUpdatedAt"
       FROM products p
       LEFT JOIN sales s ON s.product_id = p.id`
    );

    return NextResponse.json({ products: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/products
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, image, saleQuantity, salePrice } = body;

    if (!name || typeof price === "undefined" || !image) {
      return NextResponse.json(
        { error: "Name, price, and image are required" },
        { status: 400 }
      );
    }

    // 🚫 Prevent duplicate image
    const existing = await pool.query(
      "SELECT id FROM products WHERE image = $1 LIMIT 1",
      [image]
    );

    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "A product with this image already exists" },
        { status: 409 }
      );
    }

    // ✅ Insert product
    const insertResult = await pool.query<{ id: number }>(
      "INSERT INTO products (name, price, image) VALUES ($1, $2, $3) RETURNING id",
      [name, price, image]
    );

    const productId = insertResult.rows[0].id;

    // Optional: Insert sale
    const quantity = Number(saleQuantity);
    const sale = Number(salePrice);
    const isValidQuantity = !isNaN(quantity) && quantity > 0;
    const isValidSalePrice = !isNaN(sale) && sale >= 0;

    if (isValidQuantity && isValidSalePrice) {
      await pool.query(
        "INSERT INTO sales (product_id, quantity, sale_price) VALUES ($1, $2, $3)",
        [productId, quantity, sale]
      );
      return NextResponse.json(
        { message: "Product and sale added", productId },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: "Product added", productId },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
