// tests/api/order-client.test.ts
import { GET as getOrdersByPhone } from "@/app/api/orders/by-phone/route";
import { GET as getClientOrder } from "@/app/api/orders/client/[id]/route";
import { POST as createOrder } from "@/app/api/orders/route";
import { NextRequest } from "next/server";
import { vi } from "vitest";

let mockPhone: string | undefined;
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: (name: string) =>
        name === "phoneNumber" && mockPhone ? { value: mockPhone } : undefined,
    })
  ),
}));

function createPostRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function createGetByPhoneRequest(phone: string): NextRequest {
  const url = new URL("http://localhost/api/orders/by-phone");
  url.searchParams.set("phone", phone);
  return new NextRequest(url, { method: "GET" });
}

function createGetClientOrderRequest(orderId: number): NextRequest {
  return new NextRequest(
    `http://localhost/api/orders/client/${orderId}`,
    { method: "GET" }
  );
}

describe("Client view orders by phone (GET /api/orders/by-phone)", () => {
  it("returns orders for phone with total and deliveryFee", async () => {
    const phone = "0505555555";
    const createRes = await createOrder(
      createPostRequest({
        phone,
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const createJson = await createRes.json();

    const getRes = await getOrdersByPhone(createGetByPhoneRequest(phone));
    expect(getRes.status).toBe(200);
    const json = await getRes.json();
    expect(json).toHaveProperty("orders");
    expect(Array.isArray(json.orders)).toBe(true);
    expect(json.orders.length).toBeGreaterThanOrEqual(1);
    const order =
      json.orders.find(
        (o: { orderId: number }) => o.orderId === createJson.orderId
      ) ?? json.orders[0];
    expect(order).toHaveProperty("total");
    expect(order).toHaveProperty("deliveryFee");
    expect(order).toHaveProperty("preGroupTotal");
    expect(order).toHaveProperty("groupDiscountTotal");
  });

  it("returns 400 when phone is missing", async () => {
    const url = new URL("http://localhost/api/orders/by-phone");
    const res = await getOrdersByPhone(new NextRequest(url, { method: "GET" }));
    expect(res.status).toBe(400);
  });
});

describe("Client view single order (GET /api/orders/client/:id)", () => {
  it("returns order with correct total and deliveryFee when phone cookie matches", async () => {
    const phone = "0501234567";
    mockPhone = phone;
    const createRes = await createOrder(
      createPostRequest({
        phone,
        items: [
          { productId: 64, productName: "Item", quantity: 2, unitPrice: 15 },
        ],
      })
    );
    expect(createRes.status).toBe(200);
    const { orderId } = await createRes.json();

    const getRes = await getClientOrder(
      createGetClientOrderRequest(orderId),
      { params: Promise.resolve({ id: String(orderId) }) }
    );
    expect(getRes.status).toBe(200);
    const json = await getRes.json();
    expect(json.order).toBeDefined();
    expect(json.order.total).toBeDefined();
    expect(json.order.deliveryFee).toBeDefined();
    expect(json.items).toBeDefined();
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.order.total).toBe(
      (json.order.preGroupTotal ?? 0) -
        (json.order.groupDiscountTotal ?? 0) +
        (json.order.deliveryFee ?? 0)
    );
  });

  it("returns 401 when phoneNumber cookie is missing", async () => {
    mockPhone = undefined;
    const getRes = await getClientOrder(
      createGetClientOrderRequest(1),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(getRes.status).toBe(401);
  });

  it("returns 404 when order does not exist or belongs to another phone", async () => {
    mockPhone = "0501234567";
    const getRes = await getClientOrder(
      createGetClientOrderRequest(99999999),
      { params: Promise.resolve({ id: "99999999" }) }
    );
    expect(getRes.status).toBe(404);
  });
});
