import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assumeRole } from "@/lib/aws/assume-role";

async function generateUploadUrl(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;

    const credentials = await assumeRole();
    const s3 = new S3Client({ region: Region, credentials });

    const command = new PutObjectCommand({
      Bucket,
      Key: filename,
      // if the client sends a specific MIME type, prefer it; otherwise fall back
      ContentType: contentType ?? "image/*",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    return NextResponse.json({
      uploadUrl,
      fileUrl: `https://${Bucket}.s3.amazonaws.com/${filename}`,
    });
  } catch (err) {
    console.error("Failed to create upload URL:", err);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}

export const POST = withMiddleware(generateUploadUrl);
