import pool from "@/lib/db";
import type { BrowserPushSubscriptionInput } from "@/lib/push/parse-subscription";

export type { BrowserPushSubscriptionInput } from "@/lib/push/parse-subscription";
export { parsePushSubscriptionBody } from "@/lib/push/parse-subscription";

export async function upsertPushSubscription(
  userId: number,
  input: BrowserPushSubscriptionInput
): Promise<void> {
  const p256dh = input.keys?.p256dh;
  const auth = input.keys?.auth;
  if (!p256dh || !auth) throw new Error("Invalid keys");
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth`,
    [userId, input.endpoint, p256dh, auth]
  );
}

export async function deletePushSubscriptionByEndpointForUser(
  userId: number,
  endpoint: string
): Promise<void> {
  await pool.query(
    `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
    [userId, endpoint]
  );
}

export async function deleteAllPushSubscriptionsForUser(
  userId: number
): Promise<void> {
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [
    userId,
  ]);
}
