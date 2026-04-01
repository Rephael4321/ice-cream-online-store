import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  revokeAllSessionsForUser,
  revokeSessionByToken,
} from "@/lib/auth/session";
import { verifyPrivilegedSession } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const logoutAll = req.nextUrl.searchParams.get("all") === "1";

    if (token) {
      if (logoutAll) {
        const session = await verifyPrivilegedSession(token);
        if (session) {
          await revokeAllSessionsForUser(session.userId);
        } else {
          await revokeSessionByToken(token);
        }
      } else {
        await revokeSessionByToken(token);
      }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE_NAME, "", {
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error("❌ Logout failed:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
