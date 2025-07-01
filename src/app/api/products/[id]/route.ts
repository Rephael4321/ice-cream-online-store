// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

type SaleCategory = {
  id: number;
  name: string;
  quantity: number;
  sale_price: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    // 1. Get base product + product sale (if any)
    const [productRows]: any = await pool.query(
      `SELECT 
         p.id, 
         p.name, 
         p.price, 
         p.image, 
         s.quantity AS productSaleQuantity, 
         s.sale_price AS productSalePrice
       FROM products p
       LEFT JOIN sales s ON s.product_id = p.id
       WHERE p.id = ?`,
      [productId]
    );

    if (productRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productRows[0];

    // 2. Get all sale categories the product belongs to
    const [saleCategories]: any = await pool.query(
      `SELECT 
         c.id, c.name, cs.quantity, cs.sale_price
       FROM categories c
       JOIN product_categories pc ON pc.category_id = c.id
       JOIN category_sales cs ON cs.category_id = c.id
       WHERE c.type = 'sale' AND pc.product_id = ?`,
      [productId]
    );

    // 3. Determine which sale applies (priority: category > product)
    let effectiveSale = null;

    if (saleCategories.length > 0) {
      const best = (saleCategories as SaleCategory[]).sort(
        (a: SaleCategory, b: SaleCategory) => a.sale_price - b.sale_price
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
        sale: effectiveSale,
      },
    });
  } catch (err: any) {
    console.error("GET /api/products/[id] failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, price, image, saleQuantity, salePrice } = body;

    if (!name || typeof price === "undefined") {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    await pool.query(
      "UPDATE products SET name = ?, price = ?, image = ? WHERE id = ?",
      [name, price, image, params.id]
    );

    const quantity = Number(saleQuantity);
    const sale = Number(salePrice);
    const isValidQuantity = !isNaN(quantity) && quantity > 0;
    const isValidSalePrice = !isNaN(sale) && sale >= 0;

    if (saleQuantity === null && salePrice === null) {
      await pool.query("DELETE FROM sales WHERE product_id = ?", [params.id]);
      return NextResponse.json({ message: "Product updated and sale removed" });
    } else if (isValidQuantity && isValidSalePrice) {
      const [saleRows]: any = await pool.query(
        "SELECT id FROM sales WHERE product_id = ?",
        [params.id]
      );

      if (saleRows.length > 0) {
        await pool.query(
          "UPDATE sales SET quantity = ?, sale_price = ? WHERE product_id = ?",
          [quantity, sale, params.id]
        );
        return NextResponse.json({ message: "Product and sale updated" });
      } else {
        await pool.query(
          "INSERT INTO sales (product_id, quantity, sale_price) VALUES (?, ?, ?)",
          [params.id, quantity, sale]
        );
        return NextResponse.json({ message: "Product updated and sale added" });
      }
    } else {
      return NextResponse.json({ message: "Product updated (sale unchanged)" });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [result]: any = await pool.query(
      "DELETE FROM products WHERE id = ?",
      [params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
