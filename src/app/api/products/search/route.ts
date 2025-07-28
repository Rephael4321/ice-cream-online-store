import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

type ProductSearchRow = {
  id: number;
  name: string;
  price: number;
  image: string;
  in_stock: boolean;
  sale_quantity: number | null;
  sale_price: number | null;
};

// === GET /api/products/search (🟢 public) ===
async function searchProducts(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query") || "";

  try {
    const result = await pool.query<ProductSearchRow>(
      `
      SELECT DISTINCT 
        p.id, 
        p.name, 
        p.price, 
        p.image, 
        p.in_stock,
        s.quantity AS sale_quantity,
        s.sale_price
      FROM products p
      JOIN product_categories pc ON pc.product_id = p.id
      JOIN categories c ON c.id = pc.category_id
      LEFT JOIN sales s ON s.product_id = p.id
      WHERE c.show_in_menu = true
        AND p.name ILIKE '%' || $1 || '%'
      `,
      [query]
    );

    return NextResponse.json({ products: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ✅ Export using middleware wrapper
export const GET = withMiddleware(searchProducts);
