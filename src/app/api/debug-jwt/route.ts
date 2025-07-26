import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { jwtVerify } from "jose";

async function debugJWT(req: NextRequest) {
  const debug: any = {
    env: process.env.NODE_ENV,
    hasSecret: !!process.env.JWT_SECRET,
    secretLength: process.env.JWT_SECRET?.length || 0,
    cookieHeader: req.headers.get("cookie") || null,
    token: null,
    jwtValid: false,
    jwtPayload: null,
    jwtError: null,
  };

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/token=([^;]+)/);
  const token = match?.[1];

  debug.token = token || null;

  if (!token) {
    debug.jwtError = "Missing token in cookie header";
    return NextResponse.json(debug);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    debug.jwtValid = true;
    debug.jwtPayload = payload;
  } catch (err: any) {
    debug.jwtError = err.message || "JWT verification failed";
  }

  return NextResponse.json(debug);
}

// ✅ Support both GET and POST for debugging
export const GET = withMiddleware(debugJWT);
export const POST = withMiddleware(debugJWT);
