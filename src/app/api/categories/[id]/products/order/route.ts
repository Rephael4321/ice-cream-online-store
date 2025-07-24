import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

// ✅ Shared Admin Check
async function verifyAdmin(): Promise<boolean> {
  try {
    const cookie = cookies();
    const token = (await cookie).get("token")?.value;
    if (!token) return false;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return (
      typeof decoded === "object" &&
      ("role" in decoded ? decoded.role === "admin" : decoded.id === "admin")
    );
  } catch {
    return false;
  }
}

// ✅ PUT /api/categories/[id]/organize — admin only
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categoryId = Number(params.id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  try {
    const { productOrder } = await req.json();

    if (!Array.isArray(productOrder)) {
      return NextResponse.json(
        { error: "Invalid product order" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (let index = 0; index < productOrder.length; index++) {
        const productId = productOrder[index];
        await client.query(
          `UPDATE product_categories
           SET sort_order = $1
           WHERE category_id = $2 AND product_id = $3`,
          [index, categoryId, productId]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Failed to update product order:", err);
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Invalid request:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
