import { NextRequest, NextResponse } from "next/server";
import { appendFileSync } from "fs";
import { join } from "path";
import { withMiddleware } from "@/lib/api/with-middleware";
import { getImageIndex, getS3ObjectsCached } from "@/lib/aws/images-index";
import { listUsedImageKeys } from "@/lib/aws/image-usage";
import { assumeRole } from "@/lib/aws/assume-role";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// #region agent log
const LOG_PATH = join(process.cwd(), "debug-0f22ca.log");
function dl(p: Record<string, unknown>) {
  try {
    appendFileSync(
      LOG_PATH,
      JSON.stringify({ sessionId: "0f22ca", ...p, timestamp: Date.now() }) +
        "\n"
    );
  } catch (_) {}
}
// #endregion

type SortKey = "name" | "updated" | "size";
type SortOrder = "asc" | "desc";

const DEFAULT_LIMIT = 50;

const BUCKET = process.env.MEDIA_BUCKET || "";
const REGION = process.env.AWS_REGION || "us-east-1";

/** When access is denied we cache the failure so we don't hit AWS again on every request. TTL 60s. */
const ACCESS_DENIED_TTL_MS = 60_000;
let accessDeniedCache: {
  at: number;
  listError: { code: string; message: string };
} | null = null;

// Fallback to a correct public S3 host if S3_PUBLIC_HOST not set
const EFFECTIVE_HOST =
  process.env.S3_PUBLIC_HOST ||
  (REGION === "us-east-1"
    ? `${BUCKET}.s3.amazonaws.com`
    : `${BUCKET}.s3.${REGION}.amazonaws.com`);

function toProxyUrl(key: string) {
  const src = `https://${EFFECTIVE_HOST}/${encodeURI(key)}`;
  return `/api/img-proxy?url=${encodeURIComponent(src)}`;
}

async function listUnusedImages(req: NextRequest) {
  // #region agent log
  dl({
    runId: "1",
    hypothesisId: "H1",
    location: "unused-images/route.ts:entry",
    message: "listUnusedImages entered",
    data: { hasBucket: !!BUCKET },
  });
  // #endregion
  try {
    if (!BUCKET) {
      throw new Error("MEDIA_BUCKET env var is missing");
    }

    // Params
    const { searchParams } = new URL(req.url);
    const sort = (searchParams.get("sort") || "updated") as SortKey;
    const order = (searchParams.get("order") || "desc") as SortOrder;
    const offset = Math.max(
      0,
      parseInt(searchParams.get("offset") || "0", 10) || 0
    );
    const limit = Math.min(
      200,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT
      )
    );
    const prefix = searchParams.get("prefix") || "images/";

    // Return cached access-denied response so we don't hit AWS again
    if (
      accessDeniedCache &&
      Date.now() - accessDeniedCache.at < ACCESS_DENIED_TTL_MS
    ) {
      return NextResponse.json(
        {
          images: [],
          total: 0,
          offset,
          limit,
          listError: accessDeniedCache.listError,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // Tiny debug
    // console.log("[unused-images] params:", {
    //   prefix,
    //   sort,
    //   order,
    //   offset,
    //   limit,
    // });
    // console.log("[unused-images] bucket/region:", BUCKET, REGION);

    // Assume role → print who we are
    let credentials: any | undefined;
    try {
      credentials = await assumeRole();
      // console.log("[unused-images] assumeRole OK");
      const sts = new STSClient({ region: REGION, credentials });
      const who = await sts.send(new GetCallerIdentityCommand({}));
      // console.log("[unused-images] caller ARN:", who.Arn);
    } catch (e: any) {
      // #region agent log
      dl({
        runId: "1",
        hypothesisId: "H1",
        location: "unused-images/route.ts:after-assumeRole-catch",
        message: "assumeRole failed, using fallback creds",
        data: { credsUndefined: credentials === undefined, errName: e?.name },
      });
      // #endregion
      console.error(
        "[unused-images] assumeRole FAILED:",
        e?.name,
        "—",
        e?.message || String(e),
        "| Current identity is not allowed to assume CLIENT_ROLE_ARN; proceeding with default AWS creds from env."
      );
      credentials = undefined; // fallback (remove if you want to fail fast)
    }

    // 1) Load display names from index (fast, cached)
    const index = await getImageIndex(credentials);
    // #region agent log
    dl({
      runId: "1",
      hypothesisId: "H3",
      location: "unused-images/route.ts:after-getImageIndex",
      message: "getImageIndex returned",
      data: {
        indexKeysCount: index?.images ? Object.keys(index.images).length : 0,
      },
    });
    // #endregion
    const nameByKey = new Map<string, string>();
    if (index?.images && typeof index.images === "object") {
      for (const hash of Object.keys(index.images)) {
        const rec = index.images[hash];
        if (rec?.key) {
          nameByKey.set(
            rec.key,
            rec.name || rec.key.split("/").pop() || rec.key
          );
        }
      }
    }

    // 2) S3 objects for size + LastModified (cached w/ TTL)
    let s3Objects: { key: string; size: number; updatedMs: number }[];
    let listError: { code: string; message: string } | undefined;
    try {
      s3Objects = await getS3ObjectsCached(prefix, credentials);
    } catch (e: any) {
      const meta = e?.$metadata || {};
      const errName = e?.name || "Error";
      const errCode = (e as any)?.Code || errName;
      const httpStatus = meta.httpStatusCode ?? "—";
      const requestId = meta.requestId ?? "—";
      // #region agent log
      dl({
        runId: "post-fix",
        hypothesisId: "H2",
        location: "unused-images/route.ts:s3-catch",
        message: "getS3ObjectsCached threw, returning empty list (graceful)",
        data: {
          errName: e?.name,
          errCode: (e as any)?.Code,
          httpStatusCode: meta.httpStatusCode,
        },
      });
      // #endregion
      console.error(
        "[unused-images] S3 ListObjects FAILED:",
        errName,
        `(${httpStatus}) —`,
        e?.message || String(e),
        "| Identity has no s3:ListBucket on bucket:",
        BUCKET,
        "| requestId:",
        requestId,
        "| Returning empty list (graceful)."
      );
      listError = {
        code: errCode,
        message: "לא ניתן לטעון תמונות.",
      };
      s3Objects = [];
      accessDeniedCache = { at: Date.now(), listError };
    }
    // s3Objects: Array<{ key: string; size: number; updatedMs: number }>

    // 3) Keys currently used in DB → Set<string> of "images/..."
    const usedKeys = await listUsedImageKeys();

    // 4) Keep only unused + map to response
    const rows = s3Objects
      .filter((o: any) => !usedKeys.has(o.key))
      .map((o: any) => ({
        key: o.key,
        url: toProxyUrl(o.key),
        name: nameByKey.get(o.key) ?? (o.key.split("/").pop() || o.key),
        size: o.size ?? 0,
        updated_at:
          o.updatedMs > 0 ? new Date(o.updatedMs).toISOString() : null,
      }));

    // 5) Sort
    rows.sort((a, b) => {
      let cmp = 0;
      if (sort === "name") {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        cmp = an.localeCompare(bn, "he");
      } else if (sort === "size") {
        cmp = a.size - b.size;
      } else {
        const am = a.updated_at ? new Date(a.updated_at).getTime() : -Infinity;
        const bm = b.updated_at ? new Date(b.updated_at).getTime() : -Infinity;
        cmp = am - bm;
      }
      if (cmp === 0) {
        cmp = (a.name || "").localeCompare(b.name || "", "he");
        if (cmp === 0) cmp = a.key.localeCompare(b.key, "he");
      }
      return order === "asc" ? cmp : -cmp;
    });

    // 6) Paginate
    const total = rows.length;
    const page = rows.slice(offset, offset + limit);

    const body: {
      images: typeof page;
      total: number;
      offset: number;
      limit: number;
      listError?: { code: string; message: string };
    } = { images: page, total, offset, limit };
    if (listError) body.listError = listError;
    else accessDeniedCache = null; // success: clear so next request tries AWS again

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    // #region agent log
    dl({
      runId: "1",
      hypothesisId: "H2",
      location: "unused-images/route.ts:outer-catch",
      message: "returning 500",
      data: { errName: err?.name, status: 500 },
    });
    // #endregion
    console.error(
      "[unused-images] error:",
      err?.name || "Error",
      err?.message || err,
      err?.stack
    );
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMiddleware(listUnusedImages);
