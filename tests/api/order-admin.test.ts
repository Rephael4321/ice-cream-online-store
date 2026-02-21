// tests/api/order-admin.test.ts
import { GET as getOrderById } from "@/app/api/orders/[id]/route";
import { POST as createOrder } from "@/app/api/orders/route";
import { createJWT } from "@/lib/jwt";
import { NextRequest } from "next/server";

function createPostRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function createGetOrderRequest(orderId: number, token?: string): NextRequest {
  const url = `http://localhost/api/orders/${orderId}`;
  const headers: Record<string, string> = {};
  if (token) headers["Cookie"] = `token=${token}`;
  return new NextRequest(url, { method: "GET", headers }) as NextRequest;
}

describe("Admin view order (GET /api/orders/:id)", () => {
  it("returns order with correct prices and product list for admin", async () => {
    const createRes = await createOrder(
      createPostRequest({
        phone: "0508888888",
        items: [
          {
            productId: 64,
            productName: "Test Product",
            quantity: 2,
            unitPrice: 10,
          },
        ],
      })
    );
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json();
    const orderId = createJson.orderId;

    const token = await createJWT({ role: "admin", id: "admin" });
    const getRes = await getOrderById(createGetOrderRequest(orderId, token), {
      params: Promise.resolve({ id: String(orderId) }),
    });
    expect(getRes.status).toBe(200);

    const json = await getRes.json();
    expect(json).toHaveProperty("order");
    expect(json).toHaveProperty("items");
    const order = json.order;
    expect(order.orderId).toBe(orderId);
    const preGroupTotal = Number(order.preGroupTotal);
    const groupDiscountTotal = Number(order.groupDiscountTotal);
    const deliveryFee = Number(order.deliveryFee ?? 0);
    const total = Number(order.total);
    expect(Number.isFinite(preGroupTotal)).toBe(true);
    expect(Number.isFinite(groupDiscountTotal)).toBe(true);
    expect(Number.isFinite(deliveryFee)).toBe(true);
    expect(Number.isFinite(total)).toBe(true);

    const subtotal = preGroupTotal - groupDiscountTotal;
    expect(total).toBe(subtotal + deliveryFee);

    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items.length).toBeGreaterThanOrEqual(1);
    const firstItem = json.items[0];
    expect(firstItem).toHaveProperty("productId");
    expect(firstItem).toHaveProperty("productName");
    expect(firstItem).toHaveProperty("quantity");
    expect(firstItem).toHaveProperty("unitPrice");
    expect(firstItem).toHaveProperty("groupDiscount");
  });

  it("returns 404 for non-existent order id", async () => {
    const token = await createJWT({ role: "admin", id: "admin" });
    const getRes = await getOrderById(
      createGetOrderRequest(99999999, token),
      { params: Promise.resolve({ id: "99999999" }) }
    );
    expect(getRes.status).toBe(404);
  });
});
