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

// ✅ PUT /api/categories/organize (admin only)
export async function PUT(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { categoryOrder } = await req.json();

    if (!Array.isArray(categoryOrder)) {
      return NextResponse.json(
        { error: "Missing categoryOrder array" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (let i = 0; i < categoryOrder.length; i++) {
        const id = categoryOrder[i];
        await client.query(
          "UPDATE categories SET sort_order = $1, updated_at = NOW() WHERE id = $2",
          [i, id]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save category order:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
