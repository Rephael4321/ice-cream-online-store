// src/app/api/categories/name/[name]/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { withMiddleware } from "@/lib/api/with-middleware";

type Ctx = { params: Promise<{ name: string }> };

// normalize: collapse any whitespace to '-', collapse multiple dashes, trim dashes
function normalizeName(input: string): string {
  return String(input || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function findCategoryIdByName(
  nameOrSlug: string
): Promise<number | null> {
  const normalized = normalizeName(decodeURIComponent(nameOrSlug));
  const q = await pool.query<{ id: number }>(
    `SELECT id
       FROM categories
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1`,
    [normalized]
  );
  return q.rows[0]?.id ?? null;
}

async function getCategoryByName(_req: NextRequest, context: Ctx) {
  const { name } = await context.params;
  const id = await findCategoryIdByName(name);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rows } = await pool.query(
    `SELECT id, name, type, description, image, parent_id, show_in_menu,
            created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS created_at,
            updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' AS updated_at
       FROM categories
      WHERE id = $1`,
    [id]
  );

  return NextResponse.json({ category: rows[0] });
}

async function updateCategoryByName(req: NextRequest, context: Ctx) {
  const { name } = await context.params;
  const id = await findCategoryIdByName(name);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Normalize the name we will save to DB
  const normalizedName = normalizeName(body.name);
  if (!normalizedName) {
    return NextResponse.json(
      { error: "Invalid category name" },
      { status: 400 }
    );
  }

  // Resolve parent by name if provided (and normalize it as well)
  let parentId: number | null = null;

  if (body.parent_id != null) {
    parentId = Number(body.parent_id) || null;
  } else if (body.parent_name) {
    const parentNorm = normalizeName(String(body.parent_name));
    if (parentNorm) {
      const p = await pool.query<{ id: number }>(
        `SELECT id FROM categories WHERE LOWER(name)=LOWER($1) LIMIT 1`,
        [parentNorm]
      );
      parentId = p.rows[0]?.id ?? null;
    }
  }

  const showInMenu =
    typeof body.show_in_menu === "boolean"
      ? body.show_in_menu
      : body.show_in_menu === 1 || body.show_in_menu === "1";

  await pool.query(
    `UPDATE categories
        SET name = $1,
            type = $2,
            image = $3,
            description = $4,
            parent_id = $5,
            show_in_menu = $6
      WHERE id = $7`,
    [
      normalizedName,
      body.type,
      body.image ?? "",
      body.description ?? "",
      parentId,
      showInMenu,
      id,
    ]
  );

  return NextResponse.json({ message: "Category updated" });
}

async function deleteCategoryByName(_req: NextRequest, context: Ctx) {
  const { name } = await context.params;
  const id = await findCategoryIdByName(name);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
  return NextResponse.json({ message: "Category deleted" });
}

// Export with middleware
export const GET = withMiddleware(getCategoryByName);
export const PUT = withMiddleware(updateCategoryByName);
export const DELETE = withMiddleware(deleteCategoryByName);
