import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function notifyOrder(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const orderId = Number(id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    await pool.query(`UPDATE orders SET is_notified = true WHERE id = $1`, [
      orderId,
    ]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to update order notification:", err);
    const error = err instanceof Error ? err.message : "Failed to notify order";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export const PATCH = withMiddleware(notifyOrder, { skipAuth: true });
