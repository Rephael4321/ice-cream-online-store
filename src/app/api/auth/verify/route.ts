import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const payload = await verifyJWT(token);
    
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    return NextResponse.json({ 
      valid: true, 
      payload: {
        role: payload.role,
        id: payload.id,
        name: payload.name,
        exp: payload.exp,
        iat: payload.iat
      }
    });
  } catch (err) {
    console.error("JWT verification error:", err);
    return NextResponse.json({ error: "Token verification failed" }, { status: 401 });
  }
}
