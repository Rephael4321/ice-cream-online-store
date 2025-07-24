import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { protectAPI } from "@/lib/api/jwt-protect";

export async function GET(req: NextRequest) {
  // ✅ Admin-only access
  const authError = await protectAPI(req);
  if (authError) return authError;

  try {
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
