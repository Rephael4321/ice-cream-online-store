import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const [rows]: any = await pool.query(
      "SELECT id, name, type, description, image, parent_id, show_in_menu FROM categories"
    );
    return NextResponse.json({ categories: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      name,
      type,
      image = "",
      description = "",
      parent_id = null,
      show_in_menu = false,
      saleQuantity,
      salePrice,
    } = await req.json();

    if (!name || !type || !["collection", "sale"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid name or type" },
        { status: 400 }
      );
    }

    const parentIdOrNull = parent_id ? Number(parent_id) : null;
    const visible = type === "collection" ? true : !!show_in_menu;

    const [result]: any = await pool.query(
      `INSERT INTO categories 
         (name, type, image, description, parent_id, show_in_menu)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, image, description, parentIdOrNull, visible]
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
      { message: "Category created", categoryId },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /categories error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const {
      id,
      name,
      type,
      image = "",
      description = "",
      parent_id = null,
      show_in_menu = false,
      saleQuantity,
      salePrice,
    } = await req.json();

    if (!id || !name || !type || !["collection", "sale"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid id, name, or type" },
        { status: 400 }
      );
    }

    const categoryId = Number(id);
    const parentIdOrNull = parent_id ? Number(parent_id) : null;
    const visible = type === "collection" ? true : !!show_in_menu;

    await pool.query(
      `UPDATE categories
       SET name = ?, type = ?, image = ?, description = ?, parent_id = ?, show_in_menu = ?
       WHERE id = ?`,
      [name, type, image, description, parentIdOrNull, visible, categoryId]
    );

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

      const [rows]: any = await pool.query(
        "SELECT id FROM category_sales WHERE category_id = ?",
        [categoryId]
      );

      if (rows.length > 0) {
        await pool.query(
          "UPDATE category_sales SET quantity = ?, sale_price = ? WHERE category_id = ?",
          [quantity, price, categoryId]
        );
      } else {
        await pool.query(
          "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES (?, ?, ?)",
          [categoryId, quantity, price]
        );
      }
    } else {
      // Remove sale if type changed
      await pool.query("DELETE FROM category_sales WHERE category_id = ?", [
        categoryId,
      ]);
    }

    return NextResponse.json({ message: "Category updated" });
  } catch (err: any) {
    console.error("PATCH /categories error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
