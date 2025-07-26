import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export async function protectAPI(
  req: NextRequest
): Promise<NextResponse | null> {
  console.log("🔐 protectAPI called");
  console.log("🔍 Request method:", req.method);

  if (req.method === "GET") {
    console.log("✅ GET request – skipping auth");
    return null;
  }

  const token = req.cookies.get("token")?.value;
  console.log("🍪 Token from cookies:", token || "[none]");

  if (!token) {
    console.warn("🚫 No token found in cookies");
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const payload = await verifyJWT(token);
    console.log("🔓 Decoded JWT payload:", payload);

    if (
      !payload ||
      typeof payload !== "object" ||
      (!("admin" in payload) && !("id" in payload))
    ) {
      console.warn("🚫 Token payload invalid structure");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      (payload as any).admin === true || (payload as any).id === "admin";

    if (!isAdmin) {
      console.warn("🚫 Token not admin");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Token verified and admin");
    return null;
  } catch (err) {
    console.error("❌ Error verifying JWT:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
