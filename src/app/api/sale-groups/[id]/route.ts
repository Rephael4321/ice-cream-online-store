import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

type SaleGroup = {
  id: number;
  name: string | null;
  image: string | null;
  quantity: number | null;
  sale_price: number | null;
  price: number | null;
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
      `SELECT id, name, image, quantity, sale_price, price, created_at, updated_at
       FROM sale_groups WHERE id = $1`,
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
    const body = await req.json();
    const { name, image } = body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query<SaleGroup>(
        `
        UPDATE sale_groups
        SET name = $1, image = $2, updated_at = now()
        WHERE id = $3
        RETURNING id, name, image, quantity, sale_price, price, created_at, updated_at
        `,
        [name ?? null, image ?? null, id]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Sale group not found" },
          { status: 404 }
        );
      }

      await client.query("COMMIT");
      return NextResponse.json(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
