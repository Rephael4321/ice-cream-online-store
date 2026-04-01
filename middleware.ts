// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "./src/lib/jwt";

const cmsPrefixes = [
  "/management-menu",
  "/products",
  "/categories",
  "/sale-groups",
  "/orders",
  "/clients",
  "/storage-areas",
  "/link-product-to-category",
  "/auth/setup",
] as const;

function isProtectedCmsPath(pathname: string): boolean {
  return cmsPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// Run on both the optimizer route and root-mounted CMS routes
export const config = {
  matcher: [
    "/_next/image",
    "/management-menu",
    "/management-menu/:path*",
    "/products/:path*",
    "/categories/:path*",
    "/sale-groups/:path*",
    "/orders/:path*",
    "/clients/:path*",
    "/storage-areas/:path*",
    "/link-product-to-category",
    "/link-product-to-category/:path*",
    "/auth/setup",
    "/auth/setup/:path*",
  ],
};

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

  const rejectToken = (redirectPath: string) => {
    const response = NextResponse.redirect(new URL(redirectPath, req.url));
    response.cookies.set("token", "", {
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
    return response;
  };

  const acceptBootstrapToken = (token: string) => {
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("token");

    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set("token", token, {
      path: "/",
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  };

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

  // ---- B) JWT gate for root-mounted CMS routes ----
  if (isProtectedCmsPath(pathname)) {
    const cookieToken = req.cookies.get("token")?.value;
    const urlToken = req.nextUrl.searchParams.get("token") ?? undefined;
    const token = cookieToken ?? urlToken;
    if (!token) {
      return rejectToken("/");
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return rejectToken("/");
    }

    if (!cookieToken && urlToken && urlToken === token) {
      return acceptBootstrapToken(urlToken);
    }
  }

  return NextResponse.next();
}
