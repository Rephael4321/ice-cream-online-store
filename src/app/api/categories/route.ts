import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db.neon";

// Shared Types
type Category = {
  id: number;
  name: string;
  type: "collection" | "sale";
  description: string | null;
  image: string | null;
  parent_id: number | null;
  show_in_menu: boolean;
  created_at: string;
  updated_at: string;
};

// GET /api/categories
export async function GET(req: NextRequest) {
  try {
    const fullView = req.nextUrl.searchParams.get("full") === "true";

    const result = await pool.query<Category>(
      `SELECT 
         id, 
         name, 
         type, 
         description, 
         image, 
         parent_id, 
         show_in_menu, 
         created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
         updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
       FROM categories
       ${fullView ? "" : "WHERE show_in_menu = true"}`
    );

    return NextResponse.json({ categories: result.rows });
  } catch (err: unknown) {
    console.error("GET /categories error:", err);
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

    const result = await pool.query(
      `INSERT INTO categories 
         (name, type, image, description, parent_id, show_in_menu)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, type, image, description, parentIdOrNull, visible]
    );

    const categoryId = result.rows[0].id;

    if (type === "sale") {
      const quantity = Number(saleQuantity);
      const price = Number(salePrice);

      if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
        return NextResponse.json(
          {
            error:
              "Valid saleQuantity and salePrice are required for sale category",
          },
          { status: 400 }
        );
      }

      await pool.query(
        "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES ($1, $2, $3)",
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

    await pool.query(
      `UPDATE categories
       SET name = $1, type = $2, image = $3, description = $4, parent_id = $5, show_in_menu = $6
       WHERE id = $7`,
      [name, type, image, description, parentIdOrNull, visible, categoryId]
    );

    if (type === "sale") {
      const quantity = Number(saleQuantity);
      const price = Number(salePrice);

      if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price < 0) {
        return NextResponse.json(
          {
            error:
              "Valid saleQuantity and salePrice are required for sale category",
          },
          { status: 400 }
        );
      }

      const result = await pool.query(
        "SELECT id FROM category_sales WHERE category_id = $1",
        [categoryId]
      );

      if (result.rows.length > 0) {
        await pool.query(
          "UPDATE category_sales SET quantity = $1, sale_price = $2 WHERE category_id = $3",
          [quantity, price, categoryId]
        );
      } else {
        await pool.query(
          "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES ($1, $2, $3)",
          [categoryId, quantity, price]
        );
      }
    } else {
      await pool.query("DELETE FROM category_sales WHERE category_id = $1", [
        categoryId,
      ]);
    }

    return NextResponse.json({ message: "Category updated" });
  } catch (err: unknown) {
    console.error("PATCH /categories error:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}
