import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";

async function deleteImage(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "Missing imageUrl" }, { status: 400 });
    }

    const key = decodeURIComponent(new URL(imageUrl).pathname.slice(1));
    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;

    const credentials = await assumeRole();
    const s3 = new S3Client({ region: Region, credentials });

    await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete image:", err);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

export const DELETE = withMiddleware(deleteImage);
