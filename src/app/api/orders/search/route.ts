import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim() ?? "";

  if (!query) return NextResponse.json({ orders: [] });

  try {
    const result = await pool.query(
      `
      SELECT
        o.id AS "orderId",
        o.is_paid AS "isPaid",
        o.is_ready AS "isReady",
        o.is_test AS "isTest",
        o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
        o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt",
        COUNT(oi.id) AS "itemCount",
        c.name AS "clientName",
        c.address AS "clientAddress",
        c.phone AS "clientPhone"
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN clients c ON c.id = o.client_id
      WHERE o.is_visible = true AND (
        CAST(o.id AS TEXT) ILIKE $1 OR
        c.name ILIKE $1 OR
        c.address ILIKE $1 OR
        c.phone ILIKE $1
      )
      GROUP BY o.id, c.id
      ORDER BY o.created_at DESC
      `,
      [`%${query}%`]
    );

    return NextResponse.json({ orders: result.rows });
  } catch (err) {
    console.error("🔍 Search failed:", err);
    return NextResponse.json({ error: "Search error" }, { status: 500 });
  }
}
