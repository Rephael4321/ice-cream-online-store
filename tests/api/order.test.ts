// tests/api/orders.test.ts
import { POST } from "@/app/api/orders/route";
import { NextRequest } from "next/server";

// Helper to mock NextRequest
function createRequest(body: any, method = "POST"): NextRequest {
  return new Request("http://localhost/api/orders", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/orders", () => {
  it("creates a new order with valid data", async () => {
    const req = createRequest({
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
  });

  it("returns 400 for missing data", async () => {
    const req = createRequest({});

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
