import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export type Role = "admin" | "driver" | "client";

function extractRole(payload: any): Role | undefined {
  // Prefer explicit role
  if (
    payload?.role === "admin" ||
    payload?.role === "driver" ||
    payload?.role === "client"
  ) {
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

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const payload = await verifyJWT(token);

    // If your verifyJWT doesn’t already enforce exp, keep this:
    if (payload?.exp && Date.now() >= payload.exp * 1000) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    const role = extractRole(payload);
    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
