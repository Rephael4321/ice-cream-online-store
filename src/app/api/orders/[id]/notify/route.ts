import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

// === POST /api/orders/:id/notify – Mark order as notified (client, no auth) ===
async function notifyOrder(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const orderId = Number(context.params.id);
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

// ✅ Apply middleware with skipAuth because it's used by clients
export const PATCH = withMiddleware(notifyOrder, { skipAuth: true });
