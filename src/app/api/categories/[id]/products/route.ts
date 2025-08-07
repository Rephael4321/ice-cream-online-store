import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function getCategoryProducts(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const categoryId = Number(params.id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `
      SELECT 
        cmi.target_type,
        cmi.target_id,
        cmi.sort_order,

        -- Product fields
        p.name AS product_name,
        p.image AS product_image,
        p.price AS product_price,
        cs.sale_price AS product_sale_price,
        cs.quantity AS product_sale_quantity,

        -- Sale group fields
        sg.name AS group_name,
        sg.image AS group_image,
        sg.price AS group_price,
        sg.sale_price AS group_sale_price,
        sg.quantity AS group_quantity,

        -- Nested product list
        (
          SELECT json_agg(json_build_object(
            'id', psg.product_id,
            'name', pr.name,
            'image', pr.image,
            'label', psg.label,
            'color', psg.color
          ))
          FROM product_sale_groups psg
          JOIN products pr ON pr.id = psg.product_id
          WHERE psg.sale_group_id = cmi.target_id
        ) AS group_products

      FROM category_multi_items cmi
      LEFT JOIN products p ON cmi.target_type = 'product' AND p.id = cmi.target_id
      LEFT JOIN category_sales cs ON cs.category_id = cmi.category_id
      LEFT JOIN sale_groups sg ON cmi.target_type = 'sale_group' AND sg.id = cmi.target_id

      WHERE cmi.category_id = $1
      ORDER BY cmi.sort_order ASC
      `,
      [categoryId]
    );

    const items = result.rows
      .map((row) => {
        if (row.target_type === "product") {
          return {
            type: "product" as const,
            id: row.target_id,
            name: row.product_name?.replace(/-/g, " ") ?? "",
            image: row.product_image,
            price: Number(row.product_price),
            sale_price: row.product_sale_price
              ? Number(row.product_sale_price)
              : null,
            sale_quantity: row.product_sale_quantity
              ? Number(row.product_sale_quantity)
              : null,
            sort_order: row.sort_order,
          };
        } else if (row.target_type === "sale_group") {
          return {
            type: "sale_group" as const,
            id: row.target_id,
            name: row.group_name?.replace(/-/g, " ") ?? "",
            image: row.group_image,
            price: Number(row.group_price),
            sale_price: Number(row.group_sale_price),
            quantity: Number(row.group_quantity),
            sort_order: row.sort_order,
            products: Array.isArray(row.group_products)
              ? row.group_products
              : [],
          };
        }

        return null;
      })
      .filter(Boolean);

    return NextResponse.json({ items });
  } catch (err) {
    console.error("❌ Failed to fetch category items:", err);
    return NextResponse.json(
      { error: "Failed to fetch category items" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getCategoryProducts);
