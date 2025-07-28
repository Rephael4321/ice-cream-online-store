import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

async function getProductStock(req: NextRequest) {
  const { ids } = await req.json();

  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
    return NextResponse.json(
      { error: "Invalid or missing product IDs" },
      { status: 400 }
    );
  }

  const result = await db.query(
    `SELECT id, in_stock FROM products WHERE id = ANY($1::int[])`,
    [ids]
  );

  const stockMap: Record<number, boolean> = {};
  for (const row of result.rows) {
    stockMap[row.id] = row.in_stock;
  }

  return NextResponse.json(stockMap);
}

export const POST = withMiddleware(getProductStock);
