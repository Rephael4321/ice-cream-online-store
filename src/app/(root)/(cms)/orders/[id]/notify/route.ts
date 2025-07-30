import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

// PATCH /api/orders/[id]/notify
async function markAsNotified(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `UPDATE orders SET is_notified = true, updated_at = NOW()
       WHERE id = $1 AND is_visible = true
       RETURNING is_notified`,
      [orderId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ isNotified: true });
  } catch (err) {
    console.error("❌ Failed to mark as notified:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export const PATCH = withMiddleware(markAsNotified);
