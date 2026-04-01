import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPrivilegedSession } from "@/lib/jwt";

export type Role = "admin" | "driver";

export function extractRole(payload: any): Role | undefined {
  // Prefer explicit role
  if (payload?.role === "admin" || payload?.role === "driver") {
    return payload.role;
  }
  // Back-compat with your existing admin tokens
  if (payload?.admin === true || payload?.id === "admin") return "admin";
  return undefined;
}

/**
 * Enforces:
 * - GET is public (unchanged)
 * - Non-GET: by default admin-only, unless `allowed` is provided.
 * - If `allowed` is provided, admin is *implicitly* allowed too.
 */
export async function protectAPI(
  req: NextRequest,
  allowed?: Role[]
): Promise<NextResponse | null> {
  // Public GET (unchanged)
  if (req.method === "GET") return null;

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const session = await verifyPrivilegedSession(token);
    if (!session) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const role = session.role;

    // Default behavior = admin-only (matches your current setup)
    const allowedSet = new Set<Role>(
      allowed && allowed.length ? [...allowed, "admin"] : ["admin"]
    );

    if (!allowedSet.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return null;
  } catch (err) {
    console.error("❌ Error verifying JWT:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
