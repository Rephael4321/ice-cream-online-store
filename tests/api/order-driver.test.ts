// tests/api/order-driver.test.ts
import { PATCH as updateDelivery } from "@/app/api/orders/[id]/delivery/route";
import { PATCH as updatePayment } from "@/app/api/orders/[id]/payment/route";
import { PATCH as updateStatus } from "@/app/api/orders/[id]/status/route";
import { POST as createOrder } from "@/app/api/orders/route";
import { POST as createProduct } from "@/app/api/products/route";
import { PATCH as updateCategory } from "@/app/api/categories/route";
import { createJWT } from "@/lib/jwt";
import { NextRequest } from "next/server";

function createPostOrderRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function createRequest(
  method: string,
  url: string,
  token: string,
  body?: unknown
): NextRequest {
  const cookies = {
    get: (name: string) =>
      name === "token" ? { value: token } : undefined,
  };
  return {
    method,
    url,
    cookies,
    headers: new Headers(
      body !== undefined
        ? { "Content-Type": "application/json" }
        : {}
    ),
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

describe("Driver can manage orders", () => {
  let driverToken: string;
  let orderId: number;

  beforeAll(async () => {
    driverToken = await createJWT({ role: "driver", id: "driver1" });
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "0506666666",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const json = await createRes.json();
    orderId = json.orderId;
  });

  it("PATCH /api/orders/:id/status with driver token returns 200", async () => {
    const res = await updateStatus(
      createRequest(
        "PATCH",
        `http://localhost/api/orders/${orderId}/status`,
        driverToken,
        { isReady: true }
      ),
      { params: Promise.resolve({ id: String(orderId) }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isReady).toBe(true);
  });

  it("PATCH /api/orders/:id/delivery with driver token returns 200", async () => {
    const res = await updateDelivery(
      createRequest(
        "PATCH",
        `http://localhost/api/orders/${orderId}/delivery`,
        driverToken,
        { isDelivered: true }
      ),
      { params: Promise.resolve({ id: String(orderId) }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isDelivered).toBe(true);
  });

  it("PATCH /api/orders/:id/payment with driver token returns 200", async () => {
    const res = await updatePayment(
      createRequest(
        "PATCH",
        `http://localhost/api/orders/${orderId}/payment`,
        driverToken,
        { paymentMethod: "cash" }
      ),
      { params: Promise.resolve({ id: String(orderId) }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.paymentMethod).toBe("cash");
    expect(json.isPaid).toBe(true);
  });
});

describe("Driver cannot mutate products or categories", () => {
  let driverToken: string;

  beforeAll(async () => {
    driverToken = await createJWT({ role: "driver", id: "driver1" });
  });

  it("POST /api/products with driver token returns 403", async () => {
    const res = await createProduct(
      createRequest("POST", "http://localhost/api/products", driverToken, {
        name: "Test Product",
        price: 10,
      })
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(String(json.error).toLowerCase()).toContain("forbidden");
  });

  it("PATCH /api/categories with driver token returns 403", async () => {
    const res = await updateCategory(
      createRequest("PATCH", "http://localhost/api/categories", driverToken, {
        id: 1,
        name: "Updated",
      })
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(String(json.error).toLowerCase()).toContain("forbidden");
  });
});
