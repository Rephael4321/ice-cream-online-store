import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

function uniqInts(a: any[]): number[] {
  return [
    ...new Set(a.filter((x) => Number.isInteger(x)).map((x) => Number(x))),
  ];
}

async function handler(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? uniqInts(body.ids) : [];
    if (ids.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }
    if (ids.length > 200) {
      ids.length = 200;
    }

    const { rows } = await pool.query(
      `
      SELECT
        psg.product_id               AS "productId",
        psg.sale_group_id            AS "groupId",
        sg.quantity                  AS "groupQty",
        sg.sale_price::numeric       AS "groupSalePrice",
        sg.price::numeric            AS "groupUnitPrice"
      FROM product_sale_groups psg
      JOIN sale_groups sg ON sg.id = psg.sale_group_id
      WHERE psg.product_id = ANY($1::int[])
      `,
      [ids]
    );

    const map: Record<
      number,
      {
        id: number;
        quantity: number;
        salePrice: number;
        unitPrice: number | null;
      }
    > = {};

    for (const r of rows) {
      map[r.productId] = {
        id: Number(r.groupId),
        quantity: Number(r.groupQty),
        salePrice: Number(r.groupSalePrice),
        unitPrice: r.groupUnitPrice != null ? Number(r.groupUnitPrice) : null,
      };
    }

    const res = NextResponse.json(map, { status: 200 });
    res.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=300"
    );
    return res;
  } catch (e) {
    console.error("❌ /api/products/sale-groups", e);
    return NextResponse.json({}, { status: 200 });
  }
}

export const POST = withMiddleware(handler, { skipAuth: true });
