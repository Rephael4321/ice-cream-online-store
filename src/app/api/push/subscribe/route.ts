import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPrivilegedSession } from "@/lib/jwt";
import {
  deleteAllPushSubscriptionsForUser,
  deletePushSubscriptionByEndpointForUser,
  parsePushSubscriptionBody,
  upsertPushSubscription,
} from "@/lib/push/subscription-db";

async function getSessionUserId(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifyPrivilegedSession(token);
  return session?.userId ?? null;
}

async function postSubscribe(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (userId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parsePushSubscriptionBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  try {
    await upsertPushSubscription(userId, parsed);
  } catch (err) {
    console.error("[push] upsert subscription:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function deleteSubscribe(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (userId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint =
    typeof body === "object" &&
    body !== null &&
    "endpoint" in body &&
    typeof (body as { endpoint: unknown }).endpoint === "string"
      ? (body as { endpoint: string }).endpoint
      : null;

  try {
    if (endpoint) {
      await deletePushSubscriptionByEndpointForUser(userId, endpoint);
    } else {
      await deleteAllPushSubscriptionsForUser(userId);
    }
  } catch (err) {
    console.error("[push] delete subscription:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withMiddleware(postSubscribe, { allowed: ["driver"] });
export const DELETE = withMiddleware(deleteSubscribe, { allowed: ["driver"] });
