import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

type SortKey =
  | "id"
  | "name"
  | "price"
  | "sale"
  | "created_at"
  | "updated_at"
  | "in_stock"
  | "categories";
type SortOrder = "asc" | "desc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeSortKey(k: string | null): SortKey {
  const allowed: SortKey[] = [
    "id",
    "name",
    "price",
    "sale",
    "created_at",
    "updated_at",
    "in_stock",
    "categories",
  ];
  return (allowed.includes(k as SortKey) ? (k as SortKey) : "id") as SortKey;
}

function sanitizeSortOrder(o: string | null): SortOrder {
  return o === "asc" ? "asc" : "desc";
}

async function listProducts(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const sort = sanitizeSortKey(url.searchParams.get("sort"));
    const order = sanitizeSortOrder(url.searchParams.get("order"));
    const offset = Math.max(
      0,
      parseInt(url.searchParams.get("offset") || "0", 10) || 0
    );
    const limit = Math.min(
      200,
      Math.max(1, parseInt(url.searchParams.get("limit") || "48", 10) || 48)
    );

    // Build WHERE (server-side filter)
    const whereClauses: string[] = [];
    const params: any[] = [];
    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      whereClauses.push(
        `(p.name ILIKE $${params.length - 1} OR p.id::text ILIKE $${
          params.length
        })`
      );
    }
    const whereSql = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    // Sorting (server)
    // Special cases:
    // - sale => COALESCE(s.quantity,0)*COALESCE(s.sale_price,0)
    // - categories => first category name (MIN over agg)
    // We’ll compute order columns in an outer SELECT.
    const orderSql = (() => {
      switch (sort) {
        case "id":
          return `ORDER BY id ${order}`;
        case "name":
          return `ORDER BY name ${order}, id DESC`;
        case "price":
          return `ORDER BY price ${order}, id DESC`;
        case "sale":
          return `ORDER BY sale_total ${order}, id DESC`;
        case "created_at":
          return `ORDER BY created_at ${order}, id DESC`;
        case "updated_at":
          return `ORDER BY updated_at ${order}, id DESC`;
        case "in_stock":
          return `ORDER BY in_stock ${order}, id DESC`;
        case "categories":
          return `ORDER BY first_category ${order}, id DESC`;
        default:
          return `ORDER BY id DESC`;
      }
    })();

    // We use a CTE "filtered" first, then compute image counts over the filtered set.
    const sql = `
      WITH filtered AS (
        SELECT
          p.id,
          p.name,
          p.price,
          p.image,
          p.in_stock,
          (p.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem') AS created_at,
          (p.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem') AS updated_at,
          s.quantity AS "saleQuantity",
          s.sale_price AS "salePrice",
          MIN(c.name) AS first_category,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.name), NULL) AS categories
        FROM products p
        LEFT JOIN sales s ON s.product_id = p.id
        LEFT JOIN product_categories pc ON pc.product_id = p.id
        LEFT JOIN categories c ON c.id = pc.category_id
        ${whereSql}
        GROUP BY p.id, s.quantity, s.sale_price
      ),
      -- image counts over filtered set
      counts AS (
        SELECT image, COUNT(*) AS use_count
        FROM filtered
        WHERE image IS NOT NULL AND image <> ''
        GROUP BY image
      ),
      total_cte AS (
        SELECT COUNT(*) AS total
        FROM filtered
      )
      SELECT
        f.id,
        f.name,
        f.price,
        f.image,
        f.in_stock,
        f.created_at,
        f.updated_at,
        f."saleQuantity",
        f."salePrice",
        f.categories,
        COALESCE(c.use_count, 0) AS image_use_count,
        f.first_category,
        COALESCE((f."saleQuantity" * f."salePrice")::numeric, 0) AS sale_total
      FROM filtered f
      LEFT JOIN counts c ON c.image = f.image
      ${orderSql}
      OFFSET ${offset}
      LIMIT ${limit};
    `;

    // Get page rows + separate total in one round trip
    const client = await pool.connect();
    try {
      const pagePromise = client.query(sql, params);
      const totalPromise = client.query(
        `
        WITH filtered AS (
          SELECT p.id
          FROM products p
          LEFT JOIN sales s ON s.product_id = p.id
          ${whereSql}
          GROUP BY p.id, s.quantity, s.sale_price
        )
        SELECT COUNT(*)::int AS total FROM filtered;
        `,
        params
      );
      const [pageRes, totalRes] = await Promise.all([
        pagePromise,
        totalPromise,
      ]);
      const total = totalRes.rows?.[0]?.total ?? 0;

      return NextResponse.json({
        products: pageRes.rows,
        total,
        offset,
        limit,
      });
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createProduct(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, image, saleQuantity, salePrice } = body;

    if (!name || typeof price === "undefined" || !image) {
      return NextResponse.json(
        { error: "Name, price, and image are required" },
        { status: 400 }
      );
    }

    // Prevent exact same image duplication at creation time (UI still shows dupes across existing)
    const existing = await pool.query(
      "SELECT id FROM products WHERE image = $1 LIMIT 1",
      [image]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "A product with this image already exists" },
        { status: 409 }
      );
    }

    const insertResult = await pool.query<{ id: number }>(
      "INSERT INTO products (name, price, image) VALUES ($1, $2, $3) RETURNING id",
      [name, price, image]
    );
    const productId = insertResult.rows[0].id;

    const quantity = Number(saleQuantity);
    const sale = Number(salePrice);
    const isValidQuantity = !isNaN(quantity) && quantity > 0;
    const isValidSalePrice = !isNaN(sale) && sale >= 0;

    if (isValidQuantity && isValidSalePrice) {
      await pool.query(
        "INSERT INTO sales (product_id, quantity, sale_price) VALUES ($1, $2, $3)",
        [productId, quantity, sale]
      );
      return NextResponse.json(
        { message: "Product and sale added", productId },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: "Product added", productId },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMiddleware(listProducts);
export const POST = withMiddleware(createProduct);
