export type BrowserPushSubscriptionInput = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

export function parsePushSubscriptionBody(
  body: unknown
): BrowserPushSubscriptionInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const endpoint = b.endpoint;
  if (typeof endpoint !== "string" || !endpoint) return null;
  const keys = b.keys;
  if (!keys || typeof keys !== "object") return null;
  const k = keys as Record<string, unknown>;
  const p256dh = k.p256dh;
  const auth = k.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (!p256dh || !auth) return null;
  return { endpoint, keys: { p256dh, auth } };
}
