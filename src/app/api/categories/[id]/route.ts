// src/app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Types based on your MySQL schema
type Category = {
  id: number;
  name: string;
  type: "collection" | "sale";
  description: string | null;
  image: string | null;
  parent_id: number | null;
  show_in_menu: boolean;
};

type CategoryWithSale = Category & {
  saleQuantity: number | null;
  salePrice: number | null;
};

type CategorySale = {
  id: number;
  category_id: number;
  quantity: number;
  sale_price: number;
};

// GET /api/categories/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [rows] = await pool.query<CategoryWithSale[] & RowDataPacket[]>(
      `SELECT c.*, cs.quantity AS saleQuantity, cs.sale_price AS salePrice
       FROM categories c
       LEFT JOIN category_sales cs ON cs.category_id = c.id
       WHERE c.id = ?`,
      [params.id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: rows[0] });
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

// PUT /api/categories/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    }: {
      name: string;
      type: "collection" | "sale";
      image?: string;
      description?: string;
      parent_id?: number | null;
      show_in_menu?: boolean;
      saleQuantity?: number;
      salePrice?: number;
    } = await req.json();

    const id = Number(params.id);
    if (!id || !name || !type || !["collection", "sale"].includes(type)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const parentIdOrNull = parent_id ? Number(parent_id) : null;
    const visible = type === "collection" ? true : !!show_in_menu;

    await pool.query(
      `UPDATE categories
       SET name = ?, type = ?, image = ?, description = ?, parent_id = ?, show_in_menu = ?
       WHERE id = ?`,
      [name, type, image, description, parentIdOrNull, visible, id]
    );

    if (type === "sale") {
      const quantity = Number(saleQuantity);
      const price = Number(salePrice);

      if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: "Invalid saleQuantity or salePrice" },
          { status: 400 }
        );
      }

      const [existingSale] = await pool.query<CategorySale[] & RowDataPacket[]>(
        "SELECT * FROM category_sales WHERE category_id = ?",
        [id]
      );

      if (existingSale.length > 0) {
        await pool.query(
          "UPDATE category_sales SET quantity = ?, sale_price = ? WHERE category_id = ?",
          [quantity, price, id]
        );
      } else {
        await pool.query(
          "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES (?, ?, ?)",
          [id, quantity, price]
        );
      }
    } else {
      // Remove any existing sale if type changed
      await pool.query("DELETE FROM category_sales WHERE category_id = ?", [
        id,
      ]);
    }

    return NextResponse.json({ message: "Category updated" });
  } catch (err: unknown) {
    console.error("PUT /categories/[id] error:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}
