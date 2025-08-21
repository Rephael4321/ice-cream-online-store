import { NextRequest, NextResponse } from "next/server";
import { notifyTelegramDeprecations } from "@/lib/utils/notify-telegram-deprecations-bot";
import { protectAPI, Role } from "@/lib/api/jwt-protect";

type Handler = (req: NextRequest, context?: any) => Promise<NextResponse>;
type Middleware = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse | void>;

interface Options {
  middleware?: Middleware;
  skipAuth?: boolean;
  deprecated?: boolean | string;
  /** Extra roles (besides admin) allowed on this route's non-GET methods */
  allowed?: Role[];
}

export function withMiddleware(handler: Handler, options?: Options): Handler {
  return async (req: NextRequest, context?: any) => {
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
      // Pass through the optional allowed roles
      const protectResult = await protectAPI(req, options?.allowed);
      if (protectResult instanceof NextResponse) {
        console.warn("🛑 [withMiddleware] protectAPI blocked the request.");
        return protectResult;
      }
    }

    if (options?.middleware) {
      const result = await options.middleware(req, context);
      if (result instanceof NextResponse) {
        console.warn(
          "🛑 [withMiddleware] Custom middleware blocked the request."
        );
        return result;
      }
    }

    const response = await handler(req, context);

    if (options?.deprecated) {
      response.headers.set("Deprecation", "true");
      if (typeof options.deprecated === "string") {
        response.headers.set("X-Deprecation-Message", options.deprecated);
      }
    }

    return response;
  };
}
