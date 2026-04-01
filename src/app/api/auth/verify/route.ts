import { NextRequest, NextResponse } from "next/server";
import { verifyPrivilegedSession } from "@/lib/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token =
      typeof body?.token === "string"
        ? body.token
        : req.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const session = await verifyPrivilegedSession(token);

    if (!session) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: session.userId,
        role: session.role,
      },
      session: {
        id: session.sessionId,
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("JWT verification error:", err);
    return NextResponse.json({ error: "Token verification failed" }, { status: 401 });
  }
}
