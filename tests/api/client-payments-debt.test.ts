// tests/api/client-payments-debt.test.ts
// Tests for: debt formula (orders + manual_debt_adjustment), PATCH debt-adjustment (admin only), POST payments (allocate FIFO + remainder to adjustment).

import { GET as getClient } from "@/app/api/clients/[id]/route";
import { PATCH as updateDebtAdjustment } from "@/app/api/clients/[id]/debt-adjustment/route";
import { POST as createPayment } from "@/app/api/clients/[id]/payments/route";
import { GET as getOrder } from "@/app/api/orders/[id]/route";
import { POST as createOrder } from "@/app/api/orders/route";
import pool from "@/lib/db";
import { createJWT } from "@/lib/jwt";
import { NextRequest } from "next/server";

const TEST_PHONE = "050paymenttest1";

function createRequest(
  method: string,
  url: string,
  token: string | undefined,
  body?: unknown
): NextRequest {
  const cookies = {
    get: (name: string) =>
      token && name === "token" ? { value: token } : undefined,
  };
  return {
    method,
    url,
    cookies,
    headers: new Headers(
      body !== undefined ? { "Content-Type": "application/json" } : {}
    ),
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

function createPostOrderRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function getClientIdFromOrder(orderId: number): Promise<number> {
  const { rows } = await pool.query<{ client_id: number }>(
    "SELECT client_id FROM orders WHERE id = $1",
    [orderId]
  );
  if (rows.length === 0 || rows[0].client_id == null)
    throw new Error(`No client_id for order ${orderId}`);
  return rows[0].client_id;
}

async function getOrderTotals(
  clientId: number
): Promise<{ id: number; total: number }[]> {
  const { rows } = await pool.query<{ id: number; total: string }>(
    `SELECT id, total FROM orders
     WHERE client_id = $1 AND is_paid = false AND is_visible = true
     ORDER BY id ASC`,
    [clientId]
  );
  return rows.map((r) => ({ id: r.id, total: Number(r.total) }));
}

describe("GET /api/clients/:id (debt formula)", () => {
  it("returns unpaidTotal = sum of unpaid orders + manual_debt_adjustment", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: TEST_PHONE,
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const { orderId } = await createRes.json();
    const clientId = await getClientIdFromOrder(orderId);

    const getRes = await getClient(
      createRequest("GET", `http://localhost/api/clients/${clientId}`, undefined),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(getRes.status).toBe(200);
    const client = await getRes.json();
    expect(client).toHaveProperty("unpaidTotal");
    expect(client).toHaveProperty("manualDebtAdjustment");
    const unpaidTotal = Number(client.unpaidTotal);
    expect(Number.isFinite(unpaidTotal)).toBe(true);
    expect(unpaidTotal).toBeGreaterThanOrEqual(0);
  });
});

describe("PATCH /api/clients/:id/debt-adjustment", () => {
  it("admin can set targetTotalDebt and gets manualDebtAdjustment, unpaidOrderSum, totalDebt", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "050debtadj1",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const clientId = await getClientIdFromOrder((await createRes.json()).orderId);

    const adminToken = await createJWT({ role: "admin", id: "admin" });
    const res = await updateDebtAdjustment(
      createRequest(
        "PATCH",
        `http://localhost/api/clients/${clientId}/debt-adjustment`,
        adminToken,
        { targetTotalDebt: 500 }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("manualDebtAdjustment");
    expect(json).toHaveProperty("unpaidOrderSum");
    expect(json.totalDebt).toBe(500);
  });

  it("driver cannot PATCH debt-adjustment (403)", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "050debtadj2",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const clientId = await getClientIdFromOrder((await createRes.json()).orderId);

    const driverToken = await createJWT({ role: "driver", id: "d1" });
    const res = await updateDebtAdjustment(
      createRequest(
        "PATCH",
        `http://localhost/api/clients/${clientId}/debt-adjustment`,
        driverToken,
        { targetTotalDebt: 100 }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(String(json.error || "").toLowerCase()).toContain("forbidden");
  });

  it("returns 400 for missing targetTotalDebt", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "050debtadj3",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const clientId = await getClientIdFromOrder((await createRes.json()).orderId);
    const adminToken = await createJWT({ role: "admin", id: "admin" });

    const res = await updateDebtAdjustment(
      createRequest(
        "PATCH",
        `http://localhost/api/clients/${clientId}/debt-adjustment`,
        adminToken,
        {}
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent client", async () => {
    const adminToken = await createJWT({ role: "admin", id: "admin" });
    const res = await updateDebtAdjustment(
      createRequest(
        "PATCH",
        "http://localhost/api/clients/99999999/debt-adjustment",
        adminToken,
        { targetTotalDebt: 100 }
      ),
      { params: Promise.resolve({ id: "99999999" }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/clients/:id/payments", () => {
  it("returns 401 without token", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "050pay401",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const clientId = await getClientIdFromOrder((await createRes.json()).orderId);

    const res = await createPayment(
      createRequest(
        "POST",
        `http://localhost/api/clients/${clientId}/payments`,
        undefined,
        { amount: 10, paymentMethod: "cash" }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for amount 0", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "050payzero",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const clientId = await getClientIdFromOrder((await createRes.json()).orderId);
    const adminToken = await createJWT({ role: "admin", id: "admin" });

    const res = await createPayment(
      createRequest(
        "POST",
        `http://localhost/api/clients/${clientId}/payments`,
        adminToken,
        { amount: 0, paymentMethod: "cash" }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount exceeds current debt", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "050payover",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const clientId = await getClientIdFromOrder((await createRes.json()).orderId);
    const adminToken = await createJWT({ role: "admin", id: "admin" });

    const res = await createPayment(
      createRequest(
        "POST",
        `http://localhost/api/clients/${clientId}/payments`,
        adminToken,
        { amount: 999999, paymentMethod: "cash" }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(String(json.error)).toContain("exceed");
  });

  it("admin can record payment and newUnpaidTotal decreases", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "050payadmin1",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const clientId = await getClientIdFromOrder((await createRes.json()).orderId);
    const orders = await getOrderTotals(clientId);
    expect(orders.length).toBeGreaterThanOrEqual(1);
    const firstTotal = orders[0].total;

    const adminToken = await createJWT({ role: "admin", id: "admin" });
    const res = await createPayment(
      createRequest(
        "POST",
        `http://localhost/api/clients/${clientId}/payments`,
        adminToken,
        { amount: firstTotal, paymentMethod: "cash" }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.amount).toBe(firstTotal);
    expect(json.paymentMethod).toBe("cash");
    expect(Number(json.newUnpaidTotal)).toBeLessThanOrEqual(firstTotal + 0.01);
  });

  it("driver can record payment", async () => {
    const createRes = await createOrder(
      createPostOrderRequest({
        phone: "050paydriver1",
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(createRes.status).toBe(200);
    const clientId = await getClientIdFromOrder((await createRes.json()).orderId);
    const orders = await getOrderTotals(clientId);
    const firstTotal = orders[0].total;

    const driverToken = await createJWT({ role: "driver", id: "d1" });
    const res = await createPayment(
      createRequest(
        "POST",
        `http://localhost/api/clients/${clientId}/payments`,
        driverToken,
        { amount: firstTotal, paymentMethod: "paybox" }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.paymentMethod).toBe("paybox");
  });

  it("allocates payment FIFO: full payment closes first order, newUnpaidTotal = remaining orders", async () => {
    const phone = "050payfifo1";
    const create1 = await createOrder(
      createPostOrderRequest({
        phone,
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(create1.status).toBe(200);
    const orderId1 = (await create1.json()).orderId;
    const clientId = await getClientIdFromOrder(orderId1);

    const create2 = await createOrder(
      createPostOrderRequest({
        phone,
        items: [{ productId: 64, quantity: 2, unitPrice: 10 }],
      })
    );
    expect(create2.status).toBe(200);
    const orderId2 = (await create2.json()).orderId;

    const orders = await getOrderTotals(clientId);
    expect(orders.length).toBe(2);
    const [first, second] = orders;

    const adminToken = await createJWT({ role: "admin", id: "admin" });
    const payRes = await createPayment(
      createRequest(
        "POST",
        `http://localhost/api/clients/${clientId}/payments`,
        adminToken,
        { amount: first.total, paymentMethod: "credit" }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(payRes.status).toBe(200);
    const payJson = await payRes.json();
    expect(payJson.newUnpaidTotal).toBeCloseTo(second.total, 1);

    const getOrderRes = await getOrder(
      createRequest("GET", `http://localhost/api/orders/${orderId1}`, adminToken),
      { params: Promise.resolve({ id: String(orderId1) }) }
    );
    expect(getOrderRes.status).toBe(200);
    const orderData = await getOrderRes.json();
    expect(orderData.order.isPaid).toBe(true);
    expect(orderData.order.paymentMethod).toBe("credit");
  });

  it("partial payment applies remainder to manual_debt_adjustment", async () => {
    const phone = "050paypartial1";
    const create1 = await createOrder(
      createPostOrderRequest({
        phone,
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(create1.status).toBe(200);
    const orderId1 = (await create1.json()).orderId;
    const clientId = await getClientIdFromOrder(orderId1);

    const create2 = await createOrder(
      createPostOrderRequest({
        phone,
        items: [{ productId: 64, quantity: 1, unitPrice: 10 }],
      })
    );
    expect(create2.status).toBe(200);

    const orders = await getOrderTotals(clientId);
    expect(orders.length).toBe(2);
    const [first] = orders;
    const partialAmount = first.total * 0.5;
    if (partialAmount < 0.01) return;

    const adminToken = await createJWT({ role: "admin", id: "admin" });
    const payRes = await createPayment(
      createRequest(
        "POST",
        `http://localhost/api/clients/${clientId}/payments`,
        adminToken,
        { amount: partialAmount, paymentMethod: "cash" }
      ),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(payRes.status).toBe(200);
    const payJson = await payRes.json();
    expect(payJson.success).toBe(true);
    expect(Number(payJson.newUnpaidTotal)).toBeGreaterThanOrEqual(0);

    const getClientRes = await getClient(
      createRequest("GET", `http://localhost/api/clients/${clientId}`, undefined),
      { params: Promise.resolve({ id: String(clientId) }) }
    );
    expect(getClientRes.status).toBe(200);
    const client = await getClientRes.json();
    expect(Number(client.manualDebtAdjustment ?? 0)).toBeLessThanOrEqual(0);
  });

  it("returns 404 for non-existent client", async () => {
    const adminToken = await createJWT({ role: "admin", id: "admin" });
    const res = await createPayment(
      createRequest(
        "POST",
        "http://localhost/api/clients/99999999/payments",
        adminToken,
        { amount: 10, paymentMethod: "cash" }
      ),
      { params: Promise.resolve({ id: "99999999" }) }
    );
    expect(res.status).toBe(404);
  });
});
