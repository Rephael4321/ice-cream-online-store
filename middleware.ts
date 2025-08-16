// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./src/lib/jwt";

// Run on both the optimizer route and your CMS routes
export const config = { matcher: ["/_next/image", "/cms/:path*"] };

// Comma-separated allowlist of image origins (set in env):
// ALLOWED_IMAGE_HOSTS=ice-cream-online-store.s3.amazonaws.com
const allowedHosts = new Set(
  (process.env.ALLOWED_IMAGE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
);

export async function middleware(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  // ---- A) Image optimizer rewrite → proxy ----
  if (pathname === "/_next/image") {
    const src = req.nextUrl.searchParams.get("url");
    if (!src) return NextResponse.next();
    // 2) if it proxied don't proxy it
    if (src.startsWith("/api/img-proxy")) return NextResponse.next();

    try {
      const u = new URL(src);
      const isHttp = u.protocol === "http:" || u.protocol === "https:";
      const allowed = allowedHosts.has(u.hostname);
      if (!isHttp || !allowed) return NextResponse.next();

      const proxied = new URL("/api/img-proxy", origin);
      proxied.searchParams.set("url", src);

      const rewritten = req.nextUrl.clone();
      rewritten.searchParams.set("url", proxied.toString());

      return NextResponse.rewrite(rewritten);
    } catch {
      // src wasn't an absolute URL; skip
      return NextResponse.next();
    }
  }

  // ---- B) JWT gate for /cms/* (fast, edge-safe) ----
  if (pathname.startsWith("/cms")) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/store", req.url));
    }

    // IMPORTANT: await verification (your original code didn't)
    const payload = await verifyJWT(token); // jose checks exp/nbf
    if (!payload) {
      return NextResponse.redirect(new URL("/store", req.url));
    }
  }

  return NextResponse.next();
}
