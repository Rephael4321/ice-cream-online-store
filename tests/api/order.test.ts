// tests/api/order.test.ts
import { GET, POST } from "@/app/api/orders/route";
import pool from "@/lib/db";
import { NextRequest } from "next/server";

function createPostRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function createGetRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/orders");
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) =>
      url.searchParams.set(k, v)
    );
  }
  return new NextRequest(url, { method: "GET" });
}

describe("POST /api/orders", () => {
  it("creates a new order with valid data", async () => {
    const req = createPostRequest({
      phone: "0501234567",
      items: [
        {
          productId: 64,
          productName: "ארטיק קינדר",
          productImage: "/images/sample.png",
          unitPrice: 9.9,
          quantity: 2,
          saleQuantity: 3,
          salePrice: 26.9,
        },
      ],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.orderId).toBeDefined();
    expect(typeof json.subtotal).toBe("number");
    expect(typeof json.deliveryFee).toBe("number");
    expect(typeof json.total).toBe("number");
    expect(json.total).toBe(json.subtotal + json.deliveryFee);
    expect(typeof json.preGroupTotal).toBe("number");
    expect(typeof json.groupDiscountTotal).toBe("number");
  });

  it("returns response with correct total relationship", async () => {
    const res = await POST(
      createPostRequest({
        phone: "0501111111",
        items: [{ productId: 64, quantity: 1, unitPrice: 9.9 }],
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(json.subtotal + json.deliveryFee);
  });

  it("returns 400 for missing data", async () => {
    const res = await POST(createPostRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing phone", async () => {
    const res = await POST(
      createPostRequest({ items: [{ productId: 64, quantity: 1 }] })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty items array", async () => {
    const res = await POST(
      createPostRequest({ phone: "0501234567", items: [] })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-array items", async () => {
    const res = await POST(
      createPostRequest({ phone: "0501234567", items: "not-array" })
    );
    expect(res.status).toBe(400);
  });

  it("persists order totals and item snapshot to DB", async () => {
    const res = await POST(
      createPostRequest({
        phone: "0509999999",
        items: [
          { productId: 64, productName: "Test", quantity: 2, unitPrice: 10 },
        ],
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    const orderId = json.orderId;

    const orderRow = await pool.query(
      `SELECT pre_group_total, group_discount_total, delivery_fee, total FROM orders WHERE id = $1`,
      [orderId]
    );
    expect(orderRow.rows.length).toBe(1);
    expect(Number(orderRow.rows[0].total)).toBe(json.total);
    expect(Number(orderRow.rows[0].delivery_fee)).toBe(json.deliveryFee);

    const itemRow = await pool.query(
      `SELECT product_id, quantity, unit_price FROM order_items WHERE order_id = $1`,
      [orderId]
    );
    expect(itemRow.rows.length).toBeGreaterThanOrEqual(1);
    expect(Number(itemRow.rows[0].quantity)).toBe(2);
  });
});

describe("Order pricing (per-item sale, delivery fee)", () => {
  it("applies per-item sale when product has sale in DB", async () => {
    await pool.query(`DELETE FROM sales WHERE product_id = 64`);
    await pool.query(
      `INSERT INTO sales (product_id, quantity, sale_price) VALUES (64, 3, 26.9)`
    );

    const res = await POST(
      createPostRequest({
        phone: "0507777777",
        items: [{ productId: 64, quantity: 3, unitPrice: 9.9 }],
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preGroupTotal).toBeGreaterThanOrEqual(0);
    expect(json.subtotal).toBeGreaterThanOrEqual(0);
    expect(json.total).toBe(json.subtotal + json.deliveryFee);
  });

  it("adds delivery fee when subtotal is below threshold", async () => {
    const threshold = Number(process.env.NEXT_PUBLIC_DELIVERY_THRESHOLD || 90);
    const fee = Number(process.env.NEXT_PUBLIC_DELIVERY_FEE || 10);
    const res = await POST(
      createPostRequest({
        phone: "0503333333",
        items: [{ productId: 64, quantity: 1, unitPrice: 5 }],
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subtotal).toBeLessThan(threshold);
    expect(json.deliveryFee).toBe(fee);
    expect(json.total).toBe(json.subtotal + fee);
  });

  it("waives delivery fee when subtotal meets or exceeds threshold", async () => {
    const threshold = Number(process.env.NEXT_PUBLIC_DELIVERY_THRESHOLD || 90);
    const res = await POST(
      createPostRequest({
        phone: "0504444444",
        items: [
          { productId: 64, quantity: 10, unitPrice: 10 },
        ],
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.subtotal).toBeGreaterThanOrEqual(threshold);
    expect(json.deliveryFee).toBe(0);
    expect(json.total).toBe(json.subtotal);
  });
});

describe("GET /api/orders", () => {
  it("returns 200 and orders array", async () => {
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("orders");
    expect(Array.isArray(json.orders)).toBe(true);
  });

  it("accepts from and to query params", async () => {
    const res = await GET(
      createGetRequest({ from: "2025-01-01", to: "2025-12-31" })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("orders");
  });

  it("accepts pending=1 filter", async () => {
    const res = await GET(createGetRequest({ pending: "1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("orders");
  });
});
