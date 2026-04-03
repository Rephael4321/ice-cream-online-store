import webpush from "web-push";
import pool from "@/lib/db";
import { ensureWebPushConfigured } from "@/lib/push/vapid";
import {
  type PushSubscriptionRow,
  rowToWebPushSubscription,
} from "@/lib/push/subscription-row";

function isPermanentFailureStatus(code: number | undefined): boolean {
  return code === 410 || code === 404;
}

async function deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [
    endpoint,
  ]);
}

export async function sendPayloadToSubscription(
  row: PushSubscriptionRow,
  payload: string
): Promise<void> {
  if (!ensureWebPushConfigured()) return;
  const sub = rowToWebPushSubscription(row);
  try {
    await webpush.sendNotification(sub, payload, {
      TTL: 60 * 60,
    });
  } catch (err: unknown) {
    const status =
      typeof err === "object" &&
      err !== null &&
      "statusCode" in err &&
      typeof (err as { statusCode: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : undefined;
    const endpoint =
      typeof err === "object" &&
      err !== null &&
      "endpoint" in err &&
      typeof (err as { endpoint: unknown }).endpoint === "string"
        ? (err as { endpoint: string }).endpoint
        : row.endpoint;
    if (isPermanentFailureStatus(status)) {
      await deleteSubscriptionByEndpoint(endpoint);
    } else {
      console.error("[push] sendNotification failed:", err);
    }
  }
}

export async function sendPayloadToMany(
  rows: PushSubscriptionRow[],
  payload: string
): Promise<void> {
  await Promise.all(rows.map((r) => sendPayloadToSubscription(r, payload)));
}

export async function fetchSubscriptionsForPrivilegedRoles(): Promise<
  PushSubscriptionRow[]
> {
  const { rows } = await pool.query<{
    id: number;
    user_id: number;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    `SELECT ps.id, ps.user_id, ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     INNER JOIN users u ON u.id = ps.user_id
     WHERE u.role IN ('admin', 'driver')`
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
  }));
}

export async function fetchSubscriptionsForUser(
  userId: number
): Promise<PushSubscriptionRow[]> {
  const { rows } = await pool.query<{
    id: number;
    user_id: number;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    `SELECT ps.id, ps.user_id, ps.endpoint, ps.p256dh, ps.auth
     FROM push_subscriptions ps
     WHERE ps.user_id = $1`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
  }));
}
