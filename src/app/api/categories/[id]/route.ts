import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

// DB types
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
    const result = await pool.query<CategoryWithSale>(
      `SELECT 
         c.id,
         c.name,
         c.type,
         c.description,
         c.image,
         c.parent_id,
         c.show_in_menu,
         c.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
         c.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,
         cs.quantity AS "saleQuantity", 
         cs.sale_price AS "salePrice"
       FROM categories c
       LEFT JOIN category_sales cs ON cs.category_id = c.id
       WHERE c.id = $1`,
      [params.id]
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: result.rows[0] });
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
       SET name = $1, type = $2, image = $3, description = $4, parent_id = $5, show_in_menu = $6
       WHERE id = $7`,
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

      const existingSale = await pool.query<CategorySale>(
        "SELECT * FROM category_sales WHERE category_id = $1",
        [id]
      );

      if (existingSale.rows.length > 0) {
        await pool.query(
          "UPDATE category_sales SET quantity = $1, sale_price = $2 WHERE category_id = $3",
          [quantity, price, id]
        );
      } else {
        await pool.query(
          "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES ($1, $2, $3)",
          [id, quantity, price]
        );
      }
    } else {
      await pool.query("DELETE FROM category_sales WHERE category_id = $1", [
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

// DELETE /api/categories/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      "DELETE FROM categories WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    console.error("DELETE /categories/[id] error:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}
