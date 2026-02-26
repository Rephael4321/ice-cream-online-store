import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

async function getClients(req: NextRequest) {
  try {
    const withUnpaid = req.nextUrl.searchParams.get("withUnpaid") === "1";

    if (withUnpaid) {
      const result = await pool.query(`
        SELECT
          c.id,
          c.name,
          c.phone,
          c.address,
          c.manual_debt_adjustment AS "manualDebtAdjustment",
          c.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
          c.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,
          (COALESCE(SUM(CASE WHEN o.is_paid = false AND o.is_visible = true THEN o.total END), 0) + COALESCE(MAX(c.manual_debt_adjustment), 0))::numeric AS "unpaidTotal",
          COUNT(CASE WHEN o.is_paid = false AND o.is_visible = true THEN 1 END)::int AS "unpaidCount"
        FROM clients c
        LEFT JOIN orders o ON o.client_id = c.id
        GROUP BY c.id, c.name, c.phone, c.address, c.manual_debt_adjustment, c.created_at, c.updated_at
        ORDER BY c.created_at DESC
      `);
      return NextResponse.json({ clients: result.rows });
    }

    const result = await pool.query(`
      SELECT 
        id,
        name,
        phone,
        address,
        created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
        updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
      FROM clients
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ clients: result.rows });
  } catch (err) {
    console.error("❌ Error fetching clients:", err);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// ✅ Admin-only via withMiddleware
export const GET = withMiddleware(getClients);
