import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { z } from "zod";
import pool from "@/lib/db";

const PaymentMethodEnum = z.enum(["credit", "paybox", "cash"]);
const schema = z.object({
  amount: z.number().min(0),
  paymentMethod: PaymentMethodEnum,
});

async function createPayment(
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
      { error: "amount (non-negative number) and paymentMethod (credit|paybox|cash) required" },
      { status: 400 }
    );
  }
  const { amount, paymentMethod } = parsed.data;

  if (amount <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than 0" },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Resolve current debt = (sum unpaid orders) + manual_debt_adjustment
    const debtRow = await client.query<{ unpaidTotal: string }>(
      `SELECT
        ((SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.client_id = c.id AND o.is_paid = false AND o.is_visible = true)
         + COALESCE(c.manual_debt_adjustment, 0))::numeric AS "unpaidTotal"
       FROM clients c WHERE c.id = $1`,
      [clientId]
    );
    if (debtRow.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const maxAmount = Number(debtRow.rows[0].unpaidTotal ?? 0);
    if (amount > maxAmount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: `Amount cannot exceed current debt (₪${maxAmount.toFixed(2)})` },
        { status: 400 }
      );
    }

    // 2. Load unpaid orders (oldest first)
    const ordersRes = await client.query<{ id: number; total: string }>(
      `SELECT id, total FROM orders
       WHERE client_id = $1 AND is_paid = false AND is_visible = true
       ORDER BY id ASC`,
      [clientId]
    );

    let remaining = amount;

    for (const order of ordersRes.rows) {
      if (remaining <= 0) break;
      const orderTotal = Number(order.total);
      if (remaining >= orderTotal) {
        await client.query(
          `UPDATE orders SET is_paid = true, payment_method = $1, paid_at = now(), updated_at = now() WHERE id = $2`,
          [paymentMethod, order.id]
        );
        remaining -= orderTotal;
      } else {
        // Partial: apply remainder to manual_debt_adjustment only; do not mark order paid
        await client.query(
          `UPDATE clients SET manual_debt_adjustment = COALESCE(manual_debt_adjustment, 0) - $1, updated_at = now() WHERE id = $2`,
          [remaining, clientId]
        );
        remaining = 0;
        break;
      }
    }

    // Edge case: remaining > 0 after iterating (e.g. debt was only from manual_debt_adjustment)
    if (remaining > 0) {
      await client.query(
        `UPDATE clients SET manual_debt_adjustment = COALESCE(manual_debt_adjustment, 0) - $1, updated_at = now() WHERE id = $2`,
        [remaining, clientId]
      );
    }

    // 3. Recompute debt and return
    const newDebtRow = await client.query<{ unpaidTotal: string }>(
      `SELECT
        ((SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.client_id = c.id AND o.is_paid = false AND o.is_visible = true)
         + COALESCE(c.manual_debt_adjustment, 0))::numeric AS "unpaidTotal"
       FROM clients c WHERE c.id = $1`,
      [clientId]
    );
    const newUnpaidTotal = Number(newDebtRow.rows[0]?.unpaidTotal ?? 0);

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      amount,
      paymentMethod,
      newUnpaidTotal,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Create payment failed:", err);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const POST = withMiddleware(createPayment, { allowed: ["driver"] });
