import { NextRequest, NextResponse } from "next/server";
import { protectAPI } from "@/lib/api/jwt-protect";

type Handler = (req: NextRequest, context?: any) => Promise<NextResponse>;
type Middleware = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse | void>;

interface Options {
  middleware?: Middleware;
  skipAuth?: boolean; // 👈 NEW: allow bypassing protectAPI
}

export function withMiddleware(handler: Handler, options?: Options): Handler {
  return async (req: NextRequest, context?: any) => {
    console.log("🛡️ [withMiddleware] Running middleware for:", req.url);
    console.log("🔍 Method:", req.method);

    // 🚨 Always protect unless explicitly skipped
    if (!options?.skipAuth) {
      const protectResult = await protectAPI(req);
      if (protectResult instanceof NextResponse) {
        console.warn("🛑 [withMiddleware] protectAPI blocked the request.");
        return protectResult;
      }
    } else {
      console.log("🔓 [withMiddleware] Skipping protectAPI due to skipAuth.");
    }

    // ✅ Run custom middleware if provided
    if (options?.middleware) {
      const result = await options.middleware(req, context);
      if (result instanceof NextResponse) {
        console.warn(
          "🛑 [withMiddleware] Custom middleware blocked the request."
        );
        return result;
      }
      console.log("✅ [withMiddleware] Custom middleware passed.");
    }

    console.log("📦 [withMiddleware] Calling route handler...");
    const response = await handler(req, context);
    console.log("✅ [withMiddleware] Handler completed.");
    return response;
  };
}
