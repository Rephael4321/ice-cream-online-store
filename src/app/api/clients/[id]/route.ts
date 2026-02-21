import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function getClient(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clientId = Number(id);
  if (isNaN(clientId)) {
    return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT 
         c.id,
         c.name,
         c.phone,
         c.address,
         c.address_lat AS "addressLat",
         c.address_lng AS "addressLng",
         c.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
         c.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at,
         (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.client_id = c.id AND o.is_paid = false AND o.is_visible = true)::numeric AS "unpaidTotal",
         (SELECT COUNT(*)::int FROM orders o WHERE o.client_id = c.id AND o.is_paid = false AND o.is_visible = true) AS "unpaidCount"
       FROM clients c
       WHERE c.id = $1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching client:", err);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

async function updateClient(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clientId = Number(id);
  if (isNaN(clientId)) {
    return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, phone, address, address_lat, address_lng } = body as {
      name?: string;
      phone?: string;
      address?: string;
      address_lat?: number | null;
      address_lng?: number | null;
    };

    if (!name || !phone || !address) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const lat = address_lat != null && Number.isFinite(Number(address_lat)) ? Number(address_lat) : null;
    const lng = address_lng != null && Number.isFinite(Number(address_lng)) ? Number(address_lng) : null;

    await pool.query(
      `UPDATE clients SET name = $1, phone = $2, address = $3, address_lat = $5, address_lng = $6 WHERE id = $4`,
      [name.trim(), phone.trim(), address.trim(), clientId, lat, lng]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating client:", err);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

async function deleteClient(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clientId = Number(id);
  if (isNaN(clientId)) {
    return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ordersRes = await client.query<{ id: number }>(
      `SELECT id FROM orders WHERE client_id = $1`,
      [clientId]
    );
    const orderIds = ordersRes.rows.map((o) => o.id);

    if (orderIds.length > 0) {
      await client.query(`DELETE FROM orders WHERE id = ANY($1::int[])`, [
        orderIds,
      ]);
    }

    await client.query(`DELETE FROM clients WHERE id = $1`, [clientId]);

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error deleting client:", err);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const GET = withMiddleware(getClient);
export const PUT = withMiddleware(updateClient);
export const DELETE = withMiddleware(deleteClient);
