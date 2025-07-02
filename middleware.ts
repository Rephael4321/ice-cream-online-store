// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./src/lib/jwt";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  // Only protect /cms routes
  if (req.nextUrl.pathname.startsWith("/cms")) {
    const isValid = token && verifyJWT(token);

    if (!isValid) {
      return NextResponse.redirect(new URL("/store", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cms/:path*"], // applies only to /cms routes
};
