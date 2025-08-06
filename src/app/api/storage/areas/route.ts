import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function listAreas() {
  try {
    const result = await pool.query(
      `SELECT id, name, sort_order,
              created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
              updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
       FROM storage_areas
       ORDER BY sort_order ASC`
    );
    return NextResponse.json({ areas: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createArea(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT MAX(sort_order) AS max FROM storage_areas`
    );
    const nextSortOrder = (rows[0].max ?? 0) + 1;

    const result = await pool.query(
      `INSERT INTO storage_areas (name, sort_order)
       VALUES ($1, $2)
       RETURNING id, name, sort_order,
                 created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
                 updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at`,
      [name, nextSortOrder]
    );

    return NextResponse.json({ area: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMiddleware(listAreas);
export const POST = withMiddleware(createArea);
