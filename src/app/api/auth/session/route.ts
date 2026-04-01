import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPrivilegedSession } from "@/lib/jwt";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const session = await verifyPrivilegedSession(token);
    if (!session) {
      const response = NextResponse.json({ authenticated: false });
      response.cookies.set(AUTH_COOKIE_NAME, "", {
        path: "/",
        expires: new Date(0),
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({
      authenticated: true,
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
    console.error("❌ Session lookup failed:", err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
