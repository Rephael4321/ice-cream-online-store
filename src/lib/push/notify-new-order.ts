import { buildNewOrderPushPayload } from "@/lib/push/order-payload";
import {
  fetchSubscriptionsForPrivilegedRoles,
  fetchSubscriptionsForUser,
  sendPayloadToMany,
} from "@/lib/push/send-notifications";
import { ensureWebPushConfigured } from "@/lib/push/vapid";

export { buildNewOrderPushPayload } from "@/lib/push/order-payload";

/** Returned to client when /api/push/test has nothing to send to */
export const PUSH_ERROR_NO_SUBSCRIPTIONS_FOR_USER =
  "אין מנויי דחיפה רשומים למשתמש זה";

/**
 * Fan-out to all admin/superuser/driver push subscriptions. Safe to fire-and-forget.
 */
export async function notifyNewOrder(orderId: number): Promise<void> {
  if (!ensureWebPushConfigured()) return;
  try {
    const subs = await fetchSubscriptionsForPrivilegedRoles();
    if (subs.length === 0) return;
    const payload = buildNewOrderPushPayload(orderId);
    await sendPayloadToMany(subs, payload);
  } catch (err) {
    console.error("[push] notifyNewOrder failed:", err);
  }
}

export async function sendTestPushToUser(userId: number): Promise<void> {
  if (!ensureWebPushConfigured()) {
    throw new Error("VAPID not configured");
  }
  const subs = await fetchSubscriptionsForUser(userId);
  if (subs.length === 0) {
    throw new Error(PUSH_ERROR_NO_SUBSCRIPTIONS_FOR_USER);
  }
  const payload = JSON.stringify({
    title: "התראת בדיקה",
    body: "התראות פעילות",
    url: "/orders",
  });
  await sendPayloadToMany(subs, payload);
}
