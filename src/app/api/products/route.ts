import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket, OkPacket } from "mysql2";

type ProductRow = {
  id: number;
  name: string;
  price: number;
  image: string;
  saleQuantity: number | null;
  salePrice: number | null;
};

export async function GET() {
  try {
    const [rows] = await pool.query<ProductRow[] & RowDataPacket[]>(
      `SELECT 
         p.id, 
         p.name, 
         p.price, 
         p.image, 
         s.quantity AS saleQuantity, 
         s.sale_price AS salePrice
       FROM products p
       LEFT JOIN sales s ON s.product_id = p.id`
    );

    return NextResponse.json({ products: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, image, saleQuantity, salePrice } = body;

    if (!name || typeof price === "undefined") {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    const [result] = await pool.query<OkPacket>(
      "INSERT INTO products (name, price, image) VALUES (?, ?, ?)",
      [name, price, image]
    );

    const productId = result.insertId;

    const quantity = Number(saleQuantity);
    const sale = Number(salePrice);
    const isValidQuantity = !isNaN(quantity) && quantity > 0;
    const isValidSalePrice = !isNaN(sale) && sale >= 0;

    if (isValidQuantity && isValidSalePrice) {
      await pool.query<OkPacket>(
        "INSERT INTO sales (product_id, quantity, sale_price) VALUES (?, ?, ?)",
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
