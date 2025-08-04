import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

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

async function getCategory(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  const withItems = req.nextUrl.searchParams.get("withItems") === "true";

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
      [id]
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    const category = {
      ...result.rows[0],
      name: result.rows[0].name.replace(/-/g, " "),
    };

    if (!withItems) {
      return NextResponse.json({ category });
    }

    const itemsResult = await pool.query(
      `
      SELECT 
        cmi.target_type,
        cmi.target_id,
        cmi.sort_order,
        cmi.color,
        cmi.label,
        p.name AS product_name,
        p.image AS product_image,
        p.price AS product_price,
        cp.name AS category_name,
        cp.image AS category_image
      FROM category_multi_items cmi
      LEFT JOIN products p ON cmi.target_type = 'product' AND p.id = cmi.target_id
      LEFT JOIN categories cp ON cmi.target_type = 'category' AND cp.id = cmi.target_id
      WHERE cmi.category_id = $1
      ORDER BY cmi.sort_order ASC
    `,
      [id]
    );

    const items = itemsResult.rows.map((row) => {
      const base = {
        targetType: row.target_type,
        targetId: row.target_id,
        sortOrder: row.sort_order,
        color: row.color,
        label: row.label,
      };

      if (row.target_type === "product") {
        return {
          ...base,
          name: row.product_name,
          image: row.product_image,
          price: row.product_price,
        };
      } else {
        return {
          ...base,
          name: row.category_name,
          image: row.category_image,
        };
      }
    });

    return NextResponse.json({ category, items });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

async function updateCategory(
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
  } catch (err) {
    console.error("PUT /categories/[id] error:", err);
    const error = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

async function deleteCategory(
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
  } catch (err) {
    console.error("DELETE /categories/[id] error:", err);
    const error = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export const GET = withMiddleware(getCategory);
export const PUT = withMiddleware(updateCategory);
export const DELETE = withMiddleware(deleteCategory);
