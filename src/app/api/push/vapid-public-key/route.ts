import { NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { getVapidPublicKey, isVapidConfigured } from "@/lib/push/vapid";

async function getVapidKey() {
  if (!isVapidConfigured()) {
    return NextResponse.json(
      { error: "Push not configured", configured: false },
      { status: 503 }
    );
  }
  const publicKey = getVapidPublicKey();
  return NextResponse.json({ publicKey, configured: true });
}

export const GET = withMiddleware(getVapidKey, { skipAuth: true });
