import { NextRequest, NextResponse } from "next/server";
import { protectAPI } from "@/lib/api/jwt-protect";
import { notifyTelegramDeprecations } from "@/lib/utils/notify-telegram-deprecations-bot";

type Handler = (req: NextRequest, context?: any) => Promise<NextResponse>;
type Middleware = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse | void>;

interface Options {
  middleware?: Middleware;
  skipAuth?: boolean;
  deprecated?: boolean | string;
}

export function withMiddleware(handler: Handler, options?: Options): Handler {
  return async (req: NextRequest, context?: any) => {
    // console.log("🛡️ [withMiddleware] Running middleware for:", req.url);
    // console.log("🔍 Method:", req.method);

    if (options?.deprecated) {
      const deprecationMessage =
        typeof options.deprecated === "string"
          ? options.deprecated
          : "This API endpoint is deprecated and may be removed in a future version.";

      const decodedUrl = decodeURIComponent(req.nextUrl.pathname);
      const logMsg = `⚠️ [DEPRECATED] ${req.method} ${decodedUrl} - ${deprecationMessage}`;
      console.warn(logMsg);

      notifyTelegramDeprecations(
        `⚠️ DEPRECATED API CALLED:\n${req.method} ${decodedUrl}\n\n${deprecationMessage}`
      );
    }

    if (!options?.skipAuth) {
      const protectResult = await protectAPI(req);
      if (protectResult instanceof NextResponse) {
        console.warn("🛑 [withMiddleware] protectAPI blocked the request.");
        return protectResult;
      }
    } else {
      // console.log("🔓 [withMiddleware] Skipping protectAPI due to skipAuth.");
    }

    if (options?.middleware) {
      const result = await options.middleware(req, context);
      if (result instanceof NextResponse) {
        console.warn(
          "🛑 [withMiddleware] Custom middleware blocked the request."
        );
        return result;
      }
      // console.log("✅ [withMiddleware] Custom middleware passed.");
    }

    // console.log("📦 [withMiddleware] Calling route handler...");
    const response = await handler(req, context);
    // console.log("✅ [withMiddleware] Handler completed.");

    // 📨 Add deprecation header to response if API is deprecated
    if (options?.deprecated) {
      response.headers.set("Deprecation", "true");
      if (typeof options.deprecated === "string") {
        response.headers.set("X-Deprecation-Message", options.deprecated);
      }
    }

    return response;
  };
}
