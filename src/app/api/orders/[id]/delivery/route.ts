import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";
import { z } from "zod";

const schema = z.object({ isDelivered: z.boolean() });

async function updateDelivery(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { isDelivered } = parsed.data;

  try {
    const result = await pool.query(
      `UPDATE orders
         SET is_delivered = $1, updated_at = now()
       WHERE id = $2
       RETURNING is_delivered AS "isDelivered"`,
      [ isDelivered, orderId ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ isDelivered: result.rows[0].isDelivered });
  } catch (err) {
    console.error("❌ Delivery update failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const PATCH = withMiddleware(updateDelivery, { allowed: ["driver"] });


