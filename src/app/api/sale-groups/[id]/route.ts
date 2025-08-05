import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

type SaleGroup = {
  id: number;
  name: string | null;
  quantity: number | null;
  sale_price: number | null;
  created_at: string;
  updated_at: string;
};

async function getSaleGroup(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const id = Number(context.params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const result = await pool.query<SaleGroup>(
      `SELECT id, name, quantity, sale_price, created_at, updated_at FROM sale_groups WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Sale group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Failed to get sale group:", error);
    return NextResponse.json(
      { error: "Failed to get sale group" },
      { status: 500 }
    );
  }
}

async function updateSaleGroup(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const id = Number(context.params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { name, quantity, sale_price } = await req.json();

    const result = await pool.query<SaleGroup>(
      `
      UPDATE sale_groups
      SET name = $1, quantity = $2, sale_price = $3, updated_at = now()
      WHERE id = $4
      RETURNING id, name, quantity, sale_price, created_at, updated_at
      `,
      [name ?? null, quantity ?? null, sale_price ?? null, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Sale group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Failed to update sale group:", error);
    return NextResponse.json(
      { error: "Failed to update sale group" },
      { status: 500 }
    );
  }
}

async function deleteSaleGroup(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const id = Number(context.params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await pool.query(`DELETE FROM sale_groups WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Failed to delete sale group:", error);
    return NextResponse.json(
      { error: "Failed to delete sale group" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getSaleGroup);
export const PATCH = withMiddleware(updateSaleGroup);
export const DELETE = withMiddleware(deleteSaleGroup);
