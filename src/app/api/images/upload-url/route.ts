import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assumeRole } from "@/lib/aws/assume-role";

/** Encode each path segment but keep slashes */
function encodeKeyForUrl(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

/** Normalize arbitrary input (filename or relative path) into images/... */
function normalizeKey(input: string) {
  const raw = input.replace(/\\/g, "/").replace(/^\/+/, ""); // windows→unix, trim leading /
  const withoutPrefix = raw.startsWith("images/") ? raw.slice(7) : raw;

  const cleaned = withoutPrefix
    .split("/")
    .map((seg) => (seg && seg !== "." && seg !== ".." ? seg.trim() : "")) // trim segments
    .filter(Boolean)
    .join("/");

  // collapse accidental double slashes (just in case)
  const collapsed = cleaned.replace(/\/{2,}/g, "/");

  return `images/${collapsed}`;
}

/** Map STS Credentials (AccessKeyId...) OR AwsCredentialIdentity (accessKeyId...) to what S3Client expects */
function toAwsIdentity(creds: any) {
  const accessKeyId = creds?.accessKeyId ?? creds?.AccessKeyId;
  const secretAccessKey = creds?.secretAccessKey ?? creds?.SecretAccessKey;
  const sessionToken = creds?.sessionToken ?? creds?.SessionToken;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("assumeRole() returned invalid credentials");
  }
  return { accessKeyId, secretAccessKey, sessionToken };
}

async function generateUploadUrl(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // Accept { key } (may include subfolders) or legacy { filename }
    const raw: string | undefined =
      (typeof body.key === "string" && body.key) ||
      (typeof body.filename === "string" && body.filename);

    if (!raw) {
      return NextResponse.json(
        { error: "Missing key/filename" },
        { status: 400 }
      );
    }

    const contentType: string =
      typeof body.contentType === "string" && body.contentType
        ? body.contentType
        : "image/*";

    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;

    const assumed = await assumeRole();
    const credentials = toAwsIdentity(assumed);

    const s3 = new S3Client({ region: Region, credentials });

    const Key = normalizeKey(raw);

    const command = new PutObjectCommand({
      Bucket,
      Key,
      ContentType: contentType,
    });

    // Longer expiry to help bulk uploads
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    const fileUrl = `https://${Bucket}.s3.amazonaws.com/${encodeKeyForUrl(
      Key
    )}`;

    return NextResponse.json({ uploadUrl, fileUrl, key: Key });
  } catch (err) {
    console.error("Failed to create upload URL:", err);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}

export const POST = withMiddleware(generateUploadUrl);
