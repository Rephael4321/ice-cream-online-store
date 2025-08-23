import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

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
  multi_item_sort_order?: number;
};

// Normalize: remove surrounding spaces, replace any whitespace with "-",
// collapse multiple dashes, and trim leading/trailing dashes.
function normalizeName(input: string): string {
  return String(input || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getCategories(req: NextRequest) {
  try {
    const fullView = req.nextUrl.searchParams.get("full") === "true";

    const result = await pool.query<Category>(
      `
      SELECT 
        c.id,
        c.name,
        c.type,
        c.description,
        c.image,
        c.parent_id,
        c.show_in_menu,
        c.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
        c.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,
        cmi.sort_order AS multi_item_sort_order
      FROM categories c
      LEFT JOIN category_multi_items cmi
        ON cmi.target_type = 'category'
       AND cmi.target_id = c.id
       AND cmi.category_id IS NULL
      ${fullView ? "" : "WHERE c.show_in_menu = true"}
      `
    );

    const sanitized = result.rows.map((cat) => ({
      ...cat,
      name: (cat.name ?? "").trim(),
    }));

    return NextResponse.json({ categories: sanitized });
  } catch (err) {
    console.error("GET /categories error:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

async function createCategory(req: NextRequest) {
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

    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      return NextResponse.json(
        { error: "Invalid name after normalization" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const parentIdOrNull = parent_id ? Number(parent_id) : null;
      const visible = type === "collection" ? true : !!show_in_menu;

      const result = await client.query(
        `INSERT INTO categories 
         (name, type, image, description, parent_id, show_in_menu)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [normalizedName, type, image, description, parentIdOrNull, visible]
      );

      const categoryId = result.rows[0].id;

      if (parent_id) {
        await client.query(
          `INSERT INTO category_multi_items (category_id, target_type, target_id, sort_order)
           VALUES ($1, 'category', $2, (
             SELECT COALESCE(MAX(sort_order), -1) + 1
             FROM category_multi_items
             WHERE target_type = 'category' AND category_id = $1
           ))`,
          [parent_id, categoryId]
        );
      }

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

        await client.query(
          "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES ($1, $2, $3)",
          [categoryId, quantity, price]
        );
      }

      await client.query("COMMIT");

      return NextResponse.json(
        { message: "Category created", categoryId },
        { status: 201 }
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /categories error:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

async function updateCategory(req: NextRequest) {
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

    const normalizedName = normalizeName(name);
    if (!normalizedName) {
      return NextResponse.json(
        { error: "Invalid name after normalization" },
        { status: 400 }
      );
    }

    const categoryId = Number(id);
    const parentIdOrNull = parent_id ? Number(parent_id) : null;
    const visible = type === "collection" ? true : !!show_in_menu;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE categories
         SET name = $1, type = $2, image = $3, description = $4, parent_id = $5, show_in_menu = $6
         WHERE id = $7`,
        [
          normalizedName,
          type,
          image,
          description,
          parentIdOrNull,
          visible,
          categoryId,
        ]
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

        const result = await client.query(
          "SELECT id FROM category_sales WHERE category_id = $1",
          [categoryId]
        );

        if (result.rows.length > 0) {
          await client.query(
            "UPDATE category_sales SET quantity = $1, sale_price = $2 WHERE category_id = $3",
            [quantity, price, categoryId]
          );
        } else {
          await client.query(
            "INSERT INTO category_sales (category_id, quantity, sale_price) VALUES ($1, $2, $3)",
            [categoryId, quantity, price]
          );
        }
      } else {
        await client.query(
          "DELETE FROM category_sales WHERE category_id = $1",
          [categoryId]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ message: "Category updated" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("PATCH /categories error:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export const GET = getCategories;
export const POST = createCategory;
export const PATCH = updateCategory;
