import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const credentials = await assumeRole();
    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;

    const s3 = new S3Client({
      region: Region,
      credentials,
    });

    const result = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        MaxKeys: 1000,
      })
    );

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
