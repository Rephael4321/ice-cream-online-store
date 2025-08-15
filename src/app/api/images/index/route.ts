import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { assumeRole } from "@/lib/aws/assume-role";
import { getJson } from "@/lib/aws/s3";
import { INDEX_KEY, emptyIndex, ImagesIndex } from "@/lib/aws/images-index";

async function getHandler(_req: NextRequest) {
  try {
    // Assume role for S3 access
    const assumed = await assumeRole();
    const credentials = {
      accessKeyId: assumed.accessKeyId,
      secretAccessKey: assumed.secretAccessKey,
      sessionToken: assumed.sessionToken,
    };

    // Try fetching index.json from S3
    const curWrap = await getJson<ImagesIndex>(INDEX_KEY, credentials).catch(
      () => null
    );
    const cur = curWrap?.body ?? emptyIndex();

    return NextResponse.json(cur, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    console.error("Failed to fetch image index:", err);
    return NextResponse.json(emptyIndex(), { status: 200 });
  }
}

export const GET = withMiddleware(getHandler);
