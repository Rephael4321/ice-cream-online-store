import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { z } from "zod";
import pool from "@/lib/db";

const schema = z.object({ isPaid: z.boolean() });

async function updatePayment(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
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

  const { isPaid } = parsed.data;

  try {
    const result = await pool.query(
      `UPDATE orders
         SET is_paid = $1, updated_at = now()
       WHERE id = $2
       RETURNING is_paid AS "isPaid"`,
      [isPaid, orderId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ isPaid: result.rows[0].isPaid });
  } catch (err) {
    console.error("❌ Payment update failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const PATCH = withMiddleware(updatePayment, { allowed: ["driver"] });
