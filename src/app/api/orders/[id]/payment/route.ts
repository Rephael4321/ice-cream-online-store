import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { z } from "zod";
import pool from "@/lib/db";

// Accept either the new paymentMethod flow or the old isPaid boolean
const PaymentMethodEnum = z.enum(["credit", "paybox", "cash"]);
const schema = z.object({
  // New flow: "" means "לא שולם". Allow null as well.
  paymentMethod: z
    .union([PaymentMethodEnum, z.literal(""), z.null()])
    .optional(),
  // Legacy toggle — keep for compatibility
  isPaid: z.boolean().optional(),
});

async function updatePayment(
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

  const { paymentMethod, isPaid } = parsed.data;

  try {
    // New API: paymentMethod provided -> set payment_method and derive is_paid
    if (typeof paymentMethod !== "undefined") {
      // Normalize: keep "" or null as "not paid", else one of the allowed strings
      const pm =
        paymentMethod === "" || paymentMethod === null
          ? null
          : (paymentMethod as z.infer<typeof PaymentMethodEnum>);

      const result = await pool.query(
        `
        UPDATE orders
           SET payment_method = $1::text,
               is_paid        = CASE
                                  WHEN $1::text IS NOT NULL AND $1::text <> '' THEN TRUE
                                  ELSE FALSE
                                END,
               updated_at     = now()
         WHERE id = $2
         RETURNING payment_method AS "paymentMethod",
                   is_paid        AS "isPaid"
        `,
        [pm, orderId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]); // { paymentMethod, isPaid }
    }

    // Legacy API: only isPaid provided -> toggle is_paid, leave payment_method as-is
    if (typeof isPaid === "boolean") {
      const result = await pool.query(
        `
        UPDATE orders
           SET is_paid = $1,
               updated_at = now()
         WHERE id = $2
         RETURNING is_paid AS "isPaid"
        `,
        [isPaid, orderId]
      );

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      return NextResponse.json({ isPaid: result.rows[0].isPaid });
    }

    // Shouldn't reach here due to schema, but just in case:
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  } catch (err) {
    console.error("❌ Payment update failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const PATCH = withMiddleware(updatePayment, { allowed: ["driver"] });
