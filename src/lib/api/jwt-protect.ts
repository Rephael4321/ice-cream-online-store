import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export async function protectAPI(
  req: NextRequest
): Promise<NextResponse | null> {
  if (req.method === "GET") return null; // allow GET requests

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const payload = await verifyJWT(token);
  if (!payload || payload.admin !== true) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // ✅ allowed
}
