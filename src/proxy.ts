import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./lib/auth/session";
import { verifyPrivilegedSession } from "./lib/jwt";

const cmsPrefixes = [
  "/management-menu",
  "/products",
  "/categories",
  "/sale-groups",
  "/orders",
  "/clients",
  "/storage-areas",
  "/link-product-to-category",
] as const;

function isProtectedCmsPath(pathname: string): boolean {
  return cmsPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

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
  ],
};

const allowedHosts = new Set(
  (process.env.ALLOWED_IMAGE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
);

export async function proxy(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  const rejectToken = () => {
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.set(AUTH_COOKIE_NAME, "", {
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
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 8,
    });
    return response;
  };

  if (pathname === "/_next/image") {
    const src = req.nextUrl.searchParams.get("url");
    if (!src) return NextResponse.next();
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
      return NextResponse.next();
    }
  }

  if (isProtectedCmsPath(pathname)) {
    const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const urlToken = req.nextUrl.searchParams.get("token") ?? undefined;
    const token = cookieToken ?? urlToken;
    if (!token) {
      return rejectToken();
    }

    const session = await verifyPrivilegedSession(token);
    if (!session) {
      return rejectToken();
    }

    if (!cookieToken && urlToken && urlToken === token) {
      return acceptBootstrapToken(urlToken);
    }
  }

  return NextResponse.next();
}
