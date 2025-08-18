// src/app/api/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";

export const dynamic = "force-dynamic";

async function listImages(_req: NextRequest) {
  try {
    // 1. Assume role
    const credentials = await assumeRole();
    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;

    const s3 = new S3Client({
      region: Region,
      credentials,
    });

    // 2. List objects in S3
    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix: "images/",
        MaxKeys: 1000,
      })
    );

    // 3. Return full URLs
    const urls =
      (result.Contents ?? []).map(
        (item) => `https://${Bucket}.s3.amazonaws.com/${item.Key}`
      ) ?? [];

    return NextResponse.json(urls);
  } catch (err) {
    console.error("Failed to list images:", err);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(listImages);
