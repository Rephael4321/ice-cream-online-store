import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket, OkPacket } from "mysql2";

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
  productSaleQuantity: number | null;
  productSalePrice: number | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    // 1. Get base product + product sale (if any)
    const [productRows] = await pool.query<ProductRow[] & RowDataPacket[]>(
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
    const [saleCategories] = await pool.query<SaleCategory[] & RowDataPacket[]>(
      `SELECT 
         c.id, c.name, cs.quantity, cs.sale_price
       FROM categories c
       JOIN product_categories pc ON pc.category_id = c.id
       JOIN category_sales cs ON cs.category_id = c.id
       WHERE c.type = 'sale' AND pc.product_id = ?`,
      [productId]
    );

    // 3. Determine which sale applies (priority: category > product)
    let effectiveSale: any = null;

    if (saleCategories.length > 0) {
      const best = saleCategories.sort(
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
        sale: effectiveSale,
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/products/[id] failed:", err);
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
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

    await pool.query<OkPacket>(
      "UPDATE products SET name = ?, price = ?, image = ? WHERE id = ?",
      [name, price, image, params.id]
    );

    const quantity = Number(saleQuantity);
    const sale = Number(salePrice);
    const isValidQuantity = !isNaN(quantity) && quantity > 0;
    const isValidSalePrice = !isNaN(sale) && sale >= 0;

    if (saleQuantity === null && salePrice === null) {
      await pool.query<OkPacket>("DELETE FROM sales WHERE product_id = ?", [
        params.id,
      ]);
      return NextResponse.json({ message: "Product updated and sale removed" });
    } else if (isValidQuantity && isValidSalePrice) {
      const [saleRows] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM sales WHERE product_id = ?",
        [params.id]
      );

      if (saleRows.length > 0) {
        await pool.query<OkPacket>(
          "UPDATE sales SET quantity = ?, sale_price = ? WHERE product_id = ?",
          [quantity, sale, params.id]
        );
        return NextResponse.json({ message: "Product and sale updated" });
      } else {
        await pool.query<OkPacket>(
          "INSERT INTO sales (product_id, quantity, sale_price) VALUES (?, ?, ?)",
          [params.id, quantity, sale]
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [result] = await pool.query<OkPacket>(
      "DELETE FROM products WHERE id = ?",
      [params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Product deleted" });
  } catch (err: unknown) {
    const error =
      err instanceof Error ? err.message : "Unexpected error occurred";
    return NextResponse.json({ error }, { status: 500 });
  }
}
