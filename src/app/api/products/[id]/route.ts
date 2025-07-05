import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db.neon";

// Types
type SaleCategory = {
  id: number;
  name: string;
  quantity: number;
  sale_price: number;
};

type ProductRow = {
  id: number;
  name: string;
  price: number;
  image: string;
  created_at: string;
  updated_at: string;
  productSaleQuantity: number | null;
  productSalePrice: number | null;
};

type EffectiveSale =
  | {
      fromCategory: true;
      quantity: number;
      price: number;
      category: {
        id: number;
        name: string;
      };
    }
  | {
      fromCategory: false;
      quantity: number;
      price: number;
    };

// GET /api/products/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = Number(params.id);
    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const productResult = await pool.query<ProductRow>(
      `SELECT 
         p.id, 
         p.name, 
         p.price, 
         p.image, 
         p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at, 
         p.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,
         s.quantity AS "productSaleQuantity", 
         s.sale_price AS "productSalePrice"
       FROM products p
       LEFT JOIN sales s ON s.product_id = p.id
       WHERE p.id = $1`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productResult.rows[0];

    const saleCategoriesResult = await pool.query<SaleCategory>(
      `SELECT 
         c.id, c.name, cs.quantity, cs.sale_price
       FROM categories c
       JOIN product_categories pc ON pc.category_id = c.id
       JOIN category_sales cs ON cs.category_id = c.id
       WHERE c.type = 'sale' AND pc.product_id = $1`,
      [productId]
    );

    let effectiveSale: EffectiveSale | null = null;

    if (saleCategoriesResult.rows.length > 0) {
      const best = saleCategoriesResult.rows.sort(
        (a, b) => a.sale_price - b.sale_price
      )[0];

      effectiveSale = {
        fromCategory: true,
        quantity: best.quantity,
        price: best.sale_price,
        category: {
          id: best.id,
          name: best.name,
        },
      };
    } else if (
      product.productSaleQuantity != null &&
      product.productSalePrice != null
    ) {
      effectiveSale = {
        fromCategory: false,
        quantity: product.productSaleQuantity,
        price: product.productSalePrice,
      };
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        created_at: product.created_at,
        updated_at: product.updated_at,
        sale: effectiveSale,
      },
    });
  } catch (err: unknown) {
    console.error("GET /products/[id] failed:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

// PUT /api/products/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const { name, price, image, saleQuantity, salePrice } = await req.json();

    if (!name || typeof price === "undefined") {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE products SET name = $1, price = $2, image = $3 WHERE id = $4",
      [name, price, image, id]
    );

    const quantity = Number(saleQuantity);
    const sale = Number(salePrice);
    const isValidQuantity = !isNaN(quantity) && quantity > 0;
    const isValidSalePrice = !isNaN(sale) && sale >= 0;

    if (saleQuantity === null && salePrice === null) {
      await pool.query("DELETE FROM sales WHERE product_id = $1", [id]);
      return NextResponse.json({ message: "Product updated and sale removed" });
    } else if (isValidQuantity && isValidSalePrice) {
      const result = await pool.query(
        "SELECT id FROM sales WHERE product_id = $1",
        [id]
      );

      if (result.rows.length > 0) {
        await pool.query(
          "UPDATE sales SET quantity = $1, sale_price = $2 WHERE product_id = $3",
          [quantity, sale, id]
        );
        return NextResponse.json({ message: "Product and sale updated" });
      } else {
        await pool.query(
          "INSERT INTO sales (product_id, quantity, sale_price) VALUES ($1, $2, $3)",
          [id, quantity, sale]
        );
        return NextResponse.json({ message: "Product updated and sale added" });
      }
    } else {
      return NextResponse.json({ message: "Product updated (sale unchanged)" });
    }
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted" });
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}
