import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assumeRole } from "@/lib/aws/assume-role";
import { getJson, putJson } from "@/lib/aws/s3";
import { INDEX_KEY, ImagesIndex, emptyIndex } from "@/lib/aws/images-index";

/** Safeguard settings */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "avif",
  "tiff",
  "svg",
];
const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
  "image/tiff",
  "image/svg+xml",
];

/** Encode each path segment but keep slashes */
function encodeKeyForUrl(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

/** Normalize arbitrary input (filename or relative path) into images/... */
function normalizeKey(input: string) {
  const raw = String(input || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const withoutPrefix = raw.startsWith("images/") ? raw.slice(7) : raw;

  const cleaned = withoutPrefix
    .split("/")
    .map((seg) => (seg && seg !== "." && seg !== ".." ? seg.trim() : ""))
    .filter(Boolean)
    .join("/");

  const collapsed = cleaned.replace(/\/{2,}/g, "/");
  return `images/${collapsed}`;
}

/** Map STS Credentials (AccessKeyId...) OR AwsCredentialIdentity (accessKeyId...) */
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

    // Accept { key } or legacy { filename }
    const rawKey: string | undefined =
      (typeof body.key === "string" && body.key) ||
      (typeof body.filename === "string" && body.filename);

    if (!rawKey) {
      return NextResponse.json(
        { error: "Missing key/filename" },
        { status: 400 }
      );
    }

    const contentType: string =
      (typeof body.contentType === "string" && body.contentType) ||
      "application/octet-stream";

    const size: number = Number(body?.size || 0);
    const hash: string = String(body?.hash || "").toLowerCase();

    // ✅ Safeguard 1: Valid hash
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return NextResponse.json(
        { error: "valid sha256 hash required" },
        { status: 400 }
      );
    }

    // ✅ Safeguard 2: Allowed content type
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType}` },
        { status: 400 }
      );
    }

    // ✅ Safeguard 3: Allowed extension
    const ext = rawKey.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file extension: .${ext}` },
        { status: 400 }
      );
    }

    // ✅ Safeguard 4: Max size check
    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large (${(size / 1024 / 1024).toFixed(
            1
          )}MB). Max allowed is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`,
        },
        { status: 400 }
      );
    }

    // Assume once (use for index + signing)
    const assumed = await assumeRole();
    const credentials = toAwsIdentity(assumed);

    // 1) Index lookup (create if missing) using assumed creds
    const currentWrap = await getJson<ImagesIndex>(
      INDEX_KEY,
      credentials
    ).catch(() => null);
    let current = currentWrap?.body;
    if (!current) {
      current = emptyIndex();
      await putJson(INDEX_KEY, current, undefined, credentials);
    }

    const existing = current.images?.[hash];
    if (existing) {
      return NextResponse.json({ duplicate: true, existingKey: existing.key });
    }

    // 2) Not duplicate → sign a PUT with assumed creds
    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;
    const Key = normalizeKey(rawKey);

    const s3 = new S3Client({ region: Region, credentials });
    const command = new PutObjectCommand({
      Bucket,
      Key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const fileUrl = `https://${Bucket}.s3.amazonaws.com/${encodeKeyForUrl(
      Key
    )}`;

    return NextResponse.json({
      duplicate: false,
      uploadUrl,
      fileUrl,
      key: Key,
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
