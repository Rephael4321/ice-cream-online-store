import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";

// === Reusable Admin Check ===
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

// === GET /api/clients/[id] – Public Access ===
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientId = Number(params.id);
  if (isNaN(clientId)) {
    return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `SELECT 
         id,
         name,
         phone,
         address,
         created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
         updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
       FROM clients
       WHERE id = $1`,
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

// === PUT /api/clients/[id] – Admin Only ===
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = Number(params.id);
  if (isNaN(clientId)) {
    return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
  }

  try {
    const { name, phone, address } = await req.json();

    if (!name || !phone || !address) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await pool.query(
      `UPDATE clients SET name = $1, phone = $2, address = $3 WHERE id = $4`,
      [name.trim(), phone.trim(), address.trim(), clientId]
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

// === DELETE /api/clients/[id] – Admin Only ===
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = Number(params.id);
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
