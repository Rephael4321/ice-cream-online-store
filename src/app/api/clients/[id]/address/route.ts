import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function updateAddress(
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
    const { address, address_lat, address_lng } = body as {
      address?: string;
      address_lat?: number | null;
      address_lng?: number | null;
    };

    const hasAddress = address !== undefined;
    const hasLat = address_lat !== undefined;
    const hasLng = address_lng !== undefined;
    if (!hasAddress && !hasLat && !hasLng) {
      return NextResponse.json(
        { error: "At least one of address, address_lat, address_lng is required" },
        { status: 400 }
      );
    }

    const current = await pool.query(
      `SELECT address, address_lat, address_lng FROM clients WHERE id = $1`,
      [clientId]
    );
    if (current.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const row = current.rows[0];
    const newAddress = hasAddress ? String(address).trim() : (row.address ?? "");
    const newLat =
      hasLat && address_lat != null && Number.isFinite(Number(address_lat))
        ? Number(address_lat)
        : hasLat
          ? null
          : row.address_lat != null
            ? Number(row.address_lat)
            : null;
    const newLng =
      hasLng && address_lng != null && Number.isFinite(Number(address_lng))
        ? Number(address_lng)
        : hasLng
          ? null
          : row.address_lng != null
            ? Number(row.address_lng)
            : null;

    await pool.query(
      `UPDATE clients SET address = $1, address_lat = $2, address_lng = $3 WHERE id = $4`,
      [newAddress, newLat, newLng, clientId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Error updating client address:", err);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

export const PATCH = withMiddleware(updateAddress, { allowed: ["driver"] });
