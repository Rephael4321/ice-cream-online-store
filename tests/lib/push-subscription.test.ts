import { describe, expect, it } from "vitest";
import { parsePushSubscriptionBody } from "@/lib/push/parse-subscription";
import { buildNewOrderPushPayload } from "@/lib/push/order-payload";

describe("parsePushSubscriptionBody", () => {
  it("accepts valid subscription shape", () => {
    const parsed = parsePushSubscriptionBody({
      endpoint: "https://example.com/push/abc",
      keys: { p256dh: "x", auth: "y" },
    });
    expect(parsed).toEqual({
      endpoint: "https://example.com/push/abc",
      keys: { p256dh: "x", auth: "y" },
    });
  });

  it("rejects missing keys", () => {
    expect(parsePushSubscriptionBody({ endpoint: "https://x" })).toBeNull();
    expect(
      parsePushSubscriptionBody({
        endpoint: "https://x",
        keys: { p256dh: "" },
      })
    ).toBeNull();
  });
});

describe("buildNewOrderPushPayload", () => {
  it("includes orderId and Hebrew title", () => {
    const raw = buildNewOrderPushPayload(42);
    const data = JSON.parse(raw) as {
      title: string;
      body: string;
      orderId: number;
      url: string;
    };
    expect(data.orderId).toBe(42);
    expect(data.title).toBe("הזמנה חדשה");
    expect(data.body).toContain("42");
    expect(data.url).toBe("/orders/42");
  });
});
