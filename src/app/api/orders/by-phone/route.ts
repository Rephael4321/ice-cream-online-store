import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

async function getOrdersByPhone(req: NextRequest) {
  try {
    // Get phone from query parameter
    const phone = req.nextUrl.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 }
      );
    }

    // Normalize phone number (same logic as in cart)
    let normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.startsWith("972"))
      normalizedPhone = "0" + normalizedPhone.slice(3);
    if (normalizedPhone.length === 9 && normalizedPhone.startsWith("5"))
      normalizedPhone = "0" + normalizedPhone;

    // Fetch orders for this phone number
    const result = await pool.query(
      `
      SELECT
        o.id AS "orderId",
        o.is_paid AS "isPaid",
        o.is_ready AS "isReady",
        o.is_delivered AS "isDelivered",
        o.is_test AS "isTest",
        o.is_notified AS "isNotified",
        o.payment_method AS "paymentMethod",
        o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "createdAt",
        o.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS "updatedAt",
        COUNT(oi.id) AS "itemCount",
        c.name AS "clientName",
        c.address AS "clientAddress",
        c.phone AS "clientPhone",
        o.pre_group_total AS "preGroupTotal",
        o.group_discount_total AS "groupDiscountTotal",
        o.delivery_fee AS "deliveryFee",
        o.total AS "total"
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN clients c ON c.id = o.client_id
      WHERE o.is_visible = true AND c.phone = $1
      GROUP BY o.id, c.id
      ORDER BY o.created_at DESC
      LIMIT 50
      `,
      [normalizedPhone]
    );

    return NextResponse.json({ orders: result.rows });
  } catch (err: unknown) {
    console.error("Error fetching orders by phone:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getOrdersByPhone);

