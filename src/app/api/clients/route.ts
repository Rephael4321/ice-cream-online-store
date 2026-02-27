import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

async function getClients(req: NextRequest) {
  try {
    const withUnpaid = req.nextUrl.searchParams.get("withUnpaid") === "1";
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
    const searchPattern = search ? `%${search}%` : null;

    if (withUnpaid) {
      const whereClause = searchPattern
        ? "WHERE (c.name ILIKE $1 OR c.phone ILIKE $1 OR c.address ILIKE $1)"
        : "";
      const params = searchPattern ? [searchPattern] : [];
      const result = await pool.query(
        `
        SELECT
          c.id,
          c.name,
          c.phone,
          c.address,
          c.manual_debt_adjustment AS "manualDebtAdjustment",
          c.created_at AS created_at,
          c.updated_at AS updated_at,
          (COALESCE(SUM(CASE WHEN o.is_paid = false AND o.is_visible = true THEN o.total END), 0) + COALESCE(MAX(c.manual_debt_adjustment), 0))::numeric AS "unpaidTotal",
          COUNT(CASE WHEN o.is_paid = false AND o.is_visible = true THEN 1 END)::int AS "unpaidCount"
        FROM clients c
        LEFT JOIN orders o ON o.client_id = c.id
        ${whereClause}
        GROUP BY c.id, c.name, c.phone, c.address, c.manual_debt_adjustment, c.created_at, c.updated_at
        ORDER BY c.created_at DESC
      `,
        params
      );
      return NextResponse.json({ clients: result.rows });
    }

    const whereClause = searchPattern
      ? "WHERE (name ILIKE $1 OR phone ILIKE $1 OR address ILIKE $1)"
      : "";
    const params = searchPattern ? [searchPattern] : [];
    const result = await pool.query(
      `
      SELECT 
        id,
        name,
        phone,
        address,
        created_at,
        updated_at
      FROM clients
      ${whereClause}
      ORDER BY created_at DESC
    `,
      params
    );

    return NextResponse.json({ clients: result.rows });
  } catch (err) {
    console.error("❌ Error fetching clients:", err);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

async function createClient(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      phone,
      name,
      address,
      address_lat,
      address_lng,
    } = body as {
      phone?: string;
      name?: string;
      address?: string;
      address_lat?: number | null;
      address_lng?: number | null;
    };

    const phoneTrimmed = typeof phone === "string" ? phone.trim() : "";
    if (!phoneTrimmed) {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 }
      );
    }

    const existing = await pool.query<{ id: number }>(
      `SELECT id FROM clients WHERE phone = $1`,
      [phoneTrimmed]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Client with this phone already exists" },
        { status: 409 }
      );
    }

    const nameVal = name != null && typeof name === "string" ? name.trim() || null : null;
    const addressVal = address != null && typeof address === "string" ? address.trim() || null : null;
    const lat = address_lat != null && Number.isFinite(Number(address_lat)) ? Number(address_lat) : null;
    const lng = address_lng != null && Number.isFinite(Number(address_lng)) ? Number(address_lng) : null;

    const result = await pool.query(
      `INSERT INTO clients (phone, name, address, address_lat, address_lng)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         name,
         phone,
         address,
         address_lat AS "addressLat",
         address_lng AS "addressLng",
         created_at,
         updated_at`,
      [phoneTrimmed, nameVal, addressVal, lat, lng]
    );

    const row = result.rows[0];
    return NextResponse.json(row, { status: 201 });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr?.code === "23505") {
      return NextResponse.json(
        { error: "Client with this phone already exists" },
        { status: 409 }
      );
    }
    console.error("❌ Error creating client:", err);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}

// ✅ Admin-only via withMiddleware
export const GET = withMiddleware(getClients);
export const POST = withMiddleware(createClient);
