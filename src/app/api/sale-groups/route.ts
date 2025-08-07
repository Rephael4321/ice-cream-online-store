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

async function getSaleGroups(_req: NextRequest) {
  try {
    const result = await pool.query<SaleGroup>(`
      SELECT id, name, image, quantity, sale_price, price, created_at, updated_at
      FROM sale_groups
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      saleGroups: result.rows,
    });
  } catch (error) {
    console.error("❌ Failed to fetch sale groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale groups" },
      { status: 500 }
    );
  }
}

async function createSaleGroup(req: NextRequest) {
  try {
    const { name, quantity, sale_price, price, image } = await req.json();

    const result = await pool.query<SaleGroup>(
      `
      INSERT INTO sale_groups (name, quantity, sale_price, price, image)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, image, quantity, sale_price, price, created_at, updated_at
      `,
      [
        name ?? null,
        quantity ?? null,
        sale_price ?? null,
        price ?? null,
        image ?? null,
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Failed to create sale group:", error);
    return NextResponse.json(
      { error: "Failed to create sale group" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(getSaleGroups);
export const POST = withMiddleware(createSaleGroup);
