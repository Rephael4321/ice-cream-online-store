import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket, OkPacket } from "mysql2";

// Shared Types
type Category = {
  id: number;
  name: string;
  type: "collection" | "sale";
  description: string | null;
  image: string | null;
  parent_id: number | null;
  show_in_menu: boolean;
};

// GET /api/categories
export async function GET(req: NextRequest) {
  try {
    const fullView = req.nextUrl.searchParams.get("full") === "true";

    const [rows] = await pool.query<Category[] & RowDataPacket[]>(
      `SELECT id, name, type, description, image, parent_id, show_in_menu FROM categories
       ${fullView ? "" : "WHERE show_in_menu = true"}`
    );

    return NextResponse.json({ categories: rows });
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

// POST /api/categories
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

    if (!name || !type || !["collection", "sale"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid name or type" },
        { status: 400 }
      );
    }

    const parentIdOrNull = parent_id ? Number(parent_id) : null;
    const visible = type === "collection" ? true : !!show_in_menu;

    const [result] = await pool.query<OkPacket>(
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

      await pool.query<OkPacket>(
        "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES (?, ?, ?)",
        [categoryId, quantity, price]
      );
    }

    return NextResponse.json(
      { message: "Category created", categoryId },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /categories error:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

// PATCH /api/categories
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
    }: {
      id: number;
      name: string;
      type: "collection" | "sale";
      image?: string;
      description?: string;
      parent_id?: number | null;
      show_in_menu?: boolean;
      saleQuantity?: number;
      salePrice?: number;
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

    await pool.query<OkPacket>(
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

      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM category_sales WHERE category_id = ?",
        [categoryId]
      );

      if (rows.length > 0) {
        await pool.query<OkPacket>(
          "UPDATE category_sales SET quantity = ?, sale_price = ? WHERE category_id = ?",
          [quantity, price, categoryId]
        );
      } else {
        await pool.query<OkPacket>(
          "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES (?, ?, ?)",
          [categoryId, quantity, price]
        );
      }
    } else {
      await pool.query<OkPacket>(
        "DELETE FROM category_sales WHERE category_id = ?",
        [categoryId]
      );
    }

    return NextResponse.json({ message: "Category updated" });
  } catch (err: unknown) {
    console.error("PATCH /categories error:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}
