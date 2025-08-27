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
  increment_step: number; // NEW
  categories?: { id: number; name: string }[];
};

async function resolveParams<T>(p: T | Promise<T>): Promise<T> {
  return await Promise.resolve(p);
}

async function getSaleGroup(
  _req: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await resolveParams((context as any).params);
  const id = Number(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const groupResult = await pool.query<SaleGroup>(
      `
      SELECT id, name, image, quantity, sale_price, price, created_at, updated_at, increment_step
      FROM sale_groups
      WHERE id = $1
      `,
      [id]
    );
    if (groupResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Sale group not found" },
        { status: 404 }
      );
    }
    const group = groupResult.rows[0];

    const categoryResult = await pool.query(
      `
      SELECT c.id, c.name
      FROM category_multi_items cmi
      JOIN categories c ON c.id = cmi.category_id
      WHERE cmi.target_type = 'sale_group' AND cmi.target_id = $1
      `,
      [id]
    );

    return NextResponse.json({ ...group, categories: categoryResult.rows });
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
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await resolveParams((context as any).params);
  const id = Number(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = (await (async () => {
      try {
        return await req.json();
      } catch {
        return {};
      }
    })()) as {
      name?: string | null;
      image?: string | null;
      increment_step?: number | string | null;
    };

    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if ("name" in body) {
      fields.push(`name = $${i++}`);
      values.push(body.name ?? null);
    }
    if ("image" in body) {
      fields.push(`image = $${i++}`);
      values.push(body.image ?? null);
    }
    if ("increment_step" in body) {
      const raw = Number(body.increment_step);
      const step = Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1; // guard
      fields.push(`increment_step = $${i++}`);
      values.push(step);
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    fields.push(`updated_at = now()`);

    const query = `
      UPDATE sale_groups
      SET ${fields.join(", ")}
      WHERE id = $${i}
      RETURNING id, name, image, quantity, sale_price, price, created_at, updated_at, increment_step
    `;
    values.push(id);

    const result = await pool.query<SaleGroup>(query, values);
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
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await resolveParams((context as any).params);
  const id = Number(idStr);
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
