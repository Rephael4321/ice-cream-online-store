import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

async function listProducts(_req: NextRequest) {
  const result = await db.query(`
    SELECT
      p.id,
      p.name,
      p.image,
      -- Convert product timestamps to Asia/Jerusalem
      p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
      p.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,

      s.quantity AS sale_quantity,
      s.sale_price,

      -- Convert sale updated_at to Asia/Jerusalem
      s.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS sale_updated_at,

      COALESCE(
        json_agg(c.name) FILTER (WHERE c.name IS NOT NULL),
        '[]'
      ) AS categories
    FROM products p
    LEFT JOIN sales s ON s.product_id = p.id
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    LEFT JOIN categories c ON c.id = pc.category_id
    GROUP BY p.id, s.quantity, s.sale_price, s.updated_at
    ORDER BY s.quantity NULLS LAST, s.sale_price NULLS LAST
  `);

  const groups: Record<string, any[]> = {};

  for (const product of result.rows) {
    const key =
      product.sale_quantity && product.sale_price
        ? `${product.sale_quantity} ב־${product.sale_price}`
        : "ללא מבצע";

    if (!groups[key]) groups[key] = [];

    groups[key].push({
      ...product,
      has_category: product.categories.length > 0,
    });
  }

  return NextResponse.json(groups);
}

export const GET = withMiddleware(listProducts);
