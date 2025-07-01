  // src/app/api/categories/[id]/route.ts
  import { NextRequest, NextResponse } from "next/server";
  import pool from "@/lib/db";

  export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const [rows]: any = await pool.query(
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
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

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

        const [existingSale]: any = await pool.query(
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
    } catch (err: any) {
      console.error("PUT /categories/[id] error:", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
