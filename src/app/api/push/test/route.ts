import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPrivilegedSession } from "@/lib/jwt";
import {
  PUSH_ERROR_NO_SUBSCRIPTIONS_FOR_USER,
  sendTestPushToUser,
} from "@/lib/push/notify-new-order";
import { isVapidConfigured } from "@/lib/push/vapid";

async function postTest(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = await verifyPrivilegedSession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isVapidConfigured()) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  try {
    await sendTestPushToUser(session.userId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg === PUSH_ERROR_NO_SUBSCRIPTIONS_FOR_USER) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[push] test:", e);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withMiddleware(postTest, { allowed: ["driver"] });
