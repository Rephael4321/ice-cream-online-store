import request from "supertest";
import app from "../test-server";
import { cloneDevDbToTestDb } from "../utils/clone-dev-db";
import pool from "@/lib/db";

beforeEach(async () => {
  await cloneDevDbToTestDb();
  await pool.query(
    "TRUNCATE clients, orders, order_items RESTART IDENTITY CASCADE"
  );
});

afterAll(async () => {
  await pool.end();
});

test("creates a new client and order", async () => {
  const { rows } = await pool.query("SELECT * FROM products LIMIT 1");
  const product = rows[0];

  const response = await request(app)
    .post("/api/orders")
    .send({
      phone: "0501234567",
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: 2,
          unitPrice: Number(product.price),
        },
      ],
    });

  expect(response.status).toBe(200);
  expect(response.body.orderId).toBeDefined();

  const orderCheck = await pool.query("SELECT * FROM orders");
  expect(orderCheck.rows.length).toBe(1);

  const clientCheck = await pool.query(
    "SELECT * FROM clients WHERE phone = '0501234567'"
  );
  expect(clientCheck.rows.length).toBe(1);
});
