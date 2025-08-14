import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assumeRole } from "@/lib/aws/assume-role";

function buildKey(filename: string) {
  return `images/${filename}`;
}

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

    const Key = buildKey(filename);

    const command = new PutObjectCommand({
      Bucket,
      Key,
      ContentType: contentType ?? "image/*",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

    // encode the path segment properly (Hebrew, spaces, etc.)
    const fileUrl = `https://${Bucket}.s3.amazonaws.com/${encodeURI(Key)}`;

    return NextResponse.json({ uploadUrl, fileUrl });
  } catch (err) {
    console.error("Failed to create upload URL:", err);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}

export const POST = withMiddleware(generateUploadUrl);
