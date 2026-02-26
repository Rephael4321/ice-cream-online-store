import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { z } from "zod";
import pool from "@/lib/db";

const schema = z.object({
  targetTotalDebt: z.number().finite(),
});

async function updateDebtAdjustment(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId < 1) {
    return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "targetTotalDebt is required and must be a finite number" },
      { status: 400 }
    );
  }
  const { targetTotalDebt } = parsed.data;

  try {
    const client = await pool.connect();
    try {
      const sumResult = await client.query<{ sum: string }>(
        `SELECT COALESCE(SUM(o.total), 0)::numeric AS sum
         FROM orders o
         WHERE o.client_id = $1 AND o.is_paid = false AND o.is_visible = true`,
        [clientId]
      );
      const currentUnpaidSum = Number(sumResult.rows[0]?.sum ?? 0);
      const manualDebtAdjustment = targetTotalDebt - currentUnpaidSum;

      const updateResult = await client.query<{ manual_debt_adjustment: string | null }>(
        `UPDATE clients
         SET manual_debt_adjustment = $1, updated_at = now()
         WHERE id = $2
         RETURNING manual_debt_adjustment`,
        [manualDebtAdjustment, clientId]
      );

      if (updateResult.rowCount === 0) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }

      const adjustment = updateResult.rows[0].manual_debt_adjustment != null
        ? Number(updateResult.rows[0].manual_debt_adjustment)
        : 0;

      return NextResponse.json({
        manualDebtAdjustment: adjustment,
        unpaidOrderSum: currentUnpaidSum,
        totalDebt: targetTotalDebt,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Debt adjustment update failed:", err);
    return NextResponse.json(
      { error: "Failed to update debt adjustment" },
      { status: 500 }
    );
  }
}

// Admin-only: do not pass allowed so only admin can PATCH (driver gets 403)
export const PATCH = withMiddleware(updateDebtAdjustment);
