import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";

export const dynamic = "force-dynamic";

async function listImages(_req: NextRequest) {
  try {
    const credentials = await assumeRole();
    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;

    const s3 = new S3Client({ region: Region, credentials });

    // 1) Load and parse index
    const idxObj = await s3.send(
      new GetObjectCommand({ Bucket, Key: "images-index.json" })
    );
    const idxText = await idxObj.Body?.transformToString();
    const idxJson = idxText ? JSON.parse(idxText) : {};
    const imagesSection =
      idxJson?.images && typeof idxJson.images === "object"
        ? idxJson.images
        : {};

    // Build a fast lookup: key -> display name
    const nameByKey = new Map<string, string>();
    for (const hash of Object.keys(imagesSection)) {
      const rec = imagesSection[hash];
      if (rec?.key && rec?.name) nameByKey.set(rec.key, rec.name);
    }

    // 2) List S3 objects
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix: "images/",
        MaxKeys: 1000,
      })
    );

    // 3) Build response with friendly name from index
    const images =
      (result.Contents ?? []).map((item) => {
        const key = item.Key!;
        const url = `https://${Bucket}.s3.${Region}.amazonaws.com/${encodeURI(
          key
        )}`;
        return {
          url,
          key,
          name: nameByKey.get(key) ?? (key.split("/").pop() || key), // ✅ use index name when available
        };
      }) ?? [];

    return NextResponse.json(images);
  } catch (err) {
    console.error("Failed to list images:", err);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(listImages);
