import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_EQUIVALENT_ROLES,
  extractPrivilegedRoleFromPayload,
  type PrivilegedRole,
} from "@/lib/auth/roles";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPrivilegedSession } from "@/lib/jwt";

/** Privileged role used in API allowlists (admin-equivalent roles implied where documented). */
export type Role = PrivilegedRole;

export function extractRole(payload: any): Role | undefined {
  return extractPrivilegedRoleFromPayload(payload);
}

/**
 * Enforces:
 * - GET is public (unchanged)
 * - Non-GET: by default admin-only, unless `allowed` is provided.
 * - If `allowed` is provided, admin-equivalent roles (`admin`, `superuser`) are *implicitly* allowed too.
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

    const adminEquivalent = [...ADMIN_EQUIVALENT_ROLES] as Role[];
    const allowedSet = new Set<Role>(
      allowed && allowed.length
        ? [...allowed, ...adminEquivalent]
        : [...adminEquivalent]
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
