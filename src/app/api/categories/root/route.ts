import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(_req: NextRequest) {
  try {
    const result = await pool.query(
      `SELECT id, name, image, description, type
       FROM categories
       WHERE parent_id IS NULL`
    );

    return NextResponse.json({ categories: result.rows });
  } catch (err) {
    console.error("❌ Error fetching root categories:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
