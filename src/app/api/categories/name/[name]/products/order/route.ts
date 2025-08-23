// src/app/api/categories/name/[name]/products/order/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

type Ctx = { params: { name: string } };

function normalizeName(input: string): string {
  return String(input || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getCategoryIdByName(nameOrSlug: string) {
  const normalized = normalizeName(decodeURIComponent(nameOrSlug));
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [normalized]
  );
  return rows[0]?.id ?? null;
}

async function putOrder(req: NextRequest, context: Ctx) {
  const categoryId = await getCategoryIdByName(context.params.name);
  if (!categoryId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    order: Array<{ id: number; type: "product" | "sale_group" }>;
  };

  if (!body || !Array.isArray(body.order)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < body.order.length; i++) {
      const { id, type } = body.order[i];
      if (type !== "product" && type !== "sale_group") continue;

      await client.query(
        `UPDATE category_multi_items
           SET sort_order = $1
         WHERE category_id = $2
           AND target_type = $3
           AND target_id = $4`,
        [i, categoryId, type, id]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ message: "Order saved" });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("PUT /categories/name/[name]/products/order error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}

export const PUT = withMiddleware(putOrder);
