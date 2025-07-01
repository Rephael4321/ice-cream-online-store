// src/app/api/categories/name/[name]/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// TODO: FIX AWAIT ISSUE

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;

    const [rows]: any = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.price,
         p.image,
         s.quantity  AS saleQuantity,
         s.sale_price AS salePrice
       FROM products p
       JOIN product_categories pc ON pc.product_id = p.id
       JOIN categories c        ON c.id = pc.category_id
       LEFT JOIN sales s        ON s.product_id = p.id
       WHERE LOWER(REPLACE(c.name, ' ', '-')) = LOWER(?)`,
      [name]
    );

    return NextResponse.json({ products: rows });
  } catch (err: any) {
    console.error("Error in /api/categories/name/[name]/products:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
