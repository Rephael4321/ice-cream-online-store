import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function organizeCategoryItems(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate and coerce to number[]
    const raw = body?.categoryOrder as unknown;
    if (!Array.isArray(raw)) {
      return NextResponse.json(
        { error: "Missing/invalid categoryOrder (expected array)" },
        { status: 400 }
      );
    }

    const categoryOrder: number[] = (raw as unknown[]).map((x) => Number(x));
    if (categoryOrder.some((v: number) => Number.isNaN(v))) {
      return NextResponse.json(
        { error: "categoryOrder must contain only numeric IDs" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Update global category order via categories.sort_order
      await client.query(
        `
        WITH new_order AS (
          SELECT id::int, (ord::int - 1) AS sort_order
          FROM unnest($1::int[]) WITH ORDINALITY AS t(id, ord)
        )
        UPDATE categories AS c
        SET sort_order = n.sort_order,
            updated_at = NOW()
        FROM new_order AS n
        WHERE c.id = n.id
        `,
        [categoryOrder]
      );

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Transaction failed while saving category order:", err);
      return NextResponse.json(
        { error: "Failed to save order" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Failed to save category order:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const PUT = withMiddleware(organizeCategoryItems);
