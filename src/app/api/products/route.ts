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

// Extract a numeric value for price matching ("12", "₪12.5", "12,5", etc.)
function parsePriceCandidate(q: string): number | null {
  const cleaned = q.replace(/[^\d.,-]/g, "").replace(/,/g, ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function listProducts(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qRaw = (url.searchParams.get("q") || "").trim();
    const sort = url.searchParams.get("sort"); // may be null (only when user chose)
    const order = sanitizeSortOrder(url.searchParams.get("order"));
    const offset = Math.max(
      0,
      parseInt(url.searchParams.get("offset") || "0", 10) || 0
    );
    const limit = Math.min(
      200,
      Math.max(1, parseInt(url.searchParams.get("limit") || "48", 10) || 48)
    );

    const sortKey = sort ? sanitizeSortKey(sort) : null;

    // WHERE (ID + name + price (text/number))
    const whereParts: string[] = [];
    const params: any[] = [];

    if (qRaw) {
      const nameParam = `%${qRaw}%`;
      const idParam = `%${qRaw}%`;
      const priceTextParam = `%${qRaw.replace(/[,]/g, ".")}%`;

      params.push(nameParam);
      const nameSql = `p.name ILIKE $${params.length}`;

      params.push(idParam);
      const idSql = `p.id::text ILIKE $${params.length}`;

      params.push(priceTextParam);
      const priceLikeSql = `p.price::text ILIKE $${params.length}`;

      const qNum = parsePriceCandidate(qRaw);
      let priceEqSql = "";
      if (qNum !== null) {
        params.push(qNum);
        priceEqSql = ` OR p.price = $${params.length}`;
      }

      whereParts.push(
        `(${nameSql} OR ${idSql} OR ${priceLikeSql}${priceEqSql})`
      );
    }

    const whereSql = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    // ORDER BY (only when user chose a sort; otherwise stable id desc)
    const orderSql = (() => {
      if (!sortKey) return `ORDER BY f.id DESC`; // <- fixed alias (was p.id)
      switch (sortKey) {
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

    // Page query: filter -> aggregate -> count duplicate images within filtered set
    const pageSql = `
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
      counts AS (
        SELECT image, COUNT(*) AS use_count
        FROM filtered
        WHERE image IS NOT NULL AND image <> ''
        GROUP BY image
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

    // Total count (no duplicates): filter only on products; no need to join sales/categories
    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM products p
      ${whereSql};
    `;

    const client = await pool.connect();
    try {
      const [pageRes, totalRes] = await Promise.all([
        client.query(pageSql, params),
        client.query(totalSql, params),
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
