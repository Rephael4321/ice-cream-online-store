import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";
import { getJson, putJson } from "@/lib/aws/s3";
import { INDEX_KEY, emptyIndex, ImagesIndex } from "@/lib/aws/images-index";

function toKey(input: string) {
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) {
    const u = new URL(input);
    return decodeURIComponent(u.pathname.replace(/^\/+/, ""));
  }
  const raw = input.replace(/\\/g, "/").replace(/^\/+/, "");
  const withoutPrefix = raw.startsWith("images/") ? raw.slice(7) : raw;
  const cleaned = withoutPrefix
    .split("/")
    .map((seg) => (seg && seg !== "." && seg !== ".." ? seg.trim() : ""))
    .filter(Boolean)
    .join("/");
  return `images/${cleaned}`;
}

async function deleteImage(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const raw = String(body?.imageUrl || body?.key || "");
    const Key = toKey(raw);

    if (!Key || !Key.startsWith("images/")) {
      return NextResponse.json(
        { error: "Missing or invalid key/imageUrl" },
        { status: 400 }
      );
    }

    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;
    if (!Bucket || !Region) {
      return NextResponse.json(
        { error: "Server misconfigured (bucket/region)" },
        { status: 500 }
      );
    }

    // Assume once; use for S3 delete + index R/W
    const credentials = await assumeRole();
    const s3 = new S3Client({ region: Region, credentials });

    // 1) Delete object from S3 (idempotent)
    await s3.send(new DeleteObjectCommand({ Bucket, Key }));

    // 2) Remove any index entries that reference this key
    let attempts = 0;
    let removedHashes: string[] = [];

    while (true) {
      attempts++;
      const wrap = await getJson<ImagesIndex>(INDEX_KEY, credentials).catch(
        () => undefined
      );
      const cur = wrap?.body ?? emptyIndex();

      removedHashes = [];
      for (const [hash, meta] of Object.entries(cur.images)) {
        if (meta.key === Key) removedHashes.push(hash);
      }
      if (removedHashes.length === 0) break; // nothing to update

      const next: ImagesIndex = { ...cur, images: { ...cur.images } };
      for (const h of removedHashes) delete next.images[h];

      try {
        await putJson(INDEX_KEY, next, wrap?.etag, credentials);
        break;
      } catch (err: any) {
        const status = err?.$metadata?.httpStatusCode;
        const code = err?.name || err?.Code;
        if ((status === 412 || code === "PreconditionFailed") && attempts < 5) {
          continue; // retry on ETag race
        }
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      key: Key,
      removedFromIndex: removedHashes.length,
      removedHashes,
    });
  } catch (err) {
    console.error("Failed to delete image:", err);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

export const DELETE = withMiddleware(deleteImage);
