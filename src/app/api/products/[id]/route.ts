// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [rows]: any = await pool.query(
      `SELECT 
         p.id, 
         p.name, 
         p.price, 
         p.image, 
         s.quantity AS saleQuantity, 
         s.sale_price AS salePrice
       FROM products p
       LEFT JOIN sales s ON s.product_id = p.id
       WHERE p.id = ?`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, price, image, saleQuantity, salePrice } = body;

    if (!name || typeof price === "undefined") {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE products SET name = ?, price = ?, image = ? WHERE id = ?",
      [name, price, image, params.id]
    );

    const quantity = Number(saleQuantity);
    const sale = Number(salePrice);
    const isValidQuantity = !isNaN(quantity) && quantity > 0;
    const isValidSalePrice = !isNaN(sale) && sale >= 0;

    if (saleQuantity === null && salePrice === null) {
      await pool.query("DELETE FROM sales WHERE product_id = ?", [params.id]);
      return NextResponse.json({ message: "Product updated and sale removed" });
    } else if (isValidQuantity && isValidSalePrice) {
      const [saleRows]: any = await pool.query(
        "SELECT id FROM sales WHERE product_id = ?",
        [params.id]
      );

      if (saleRows.length > 0) {
        await pool.query(
          "UPDATE sales SET quantity = ?, sale_price = ? WHERE product_id = ?",
          [quantity, sale, params.id]
        );
        return NextResponse.json({ message: "Product and sale updated" });
      } else {
        await pool.query(
          "INSERT INTO sales (product_id, quantity, sale_price) VALUES (?, ?, ?)",
          [params.id, quantity, sale]
        );
        return NextResponse.json({ message: "Product updated and sale added" });
      }
    } else {
      return NextResponse.json({ message: "Product updated (sale unchanged)" });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [result]: any = await pool.query(
      "DELETE FROM products WHERE id = ?",
      [params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
