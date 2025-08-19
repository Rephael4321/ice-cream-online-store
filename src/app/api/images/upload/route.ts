import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { withMiddleware } from "@/lib/api/with-middleware";
import { assumeRole } from "@/lib/aws/assume-role";
import { getJson, putJson } from "@/lib/aws/s3";
import { INDEX_KEY, ImagesIndex, emptyIndex } from "@/lib/aws/images-index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-only upload policy */
const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
  "image/tiff",
  "image/svg+xml",
]);

function toAwsIdentity(creds: any) {
  const accessKeyId = creds?.accessKeyId ?? creds?.AccessKeyId;
  const secretAccessKey = creds?.secretAccessKey ?? creds?.SecretAccessKey;
  const sessionToken = creds?.sessionToken ?? creds?.SessionToken;
  if (!accessKeyId || !secretAccessKey) throw new Error("Bad STS creds");
  return { accessKeyId, secretAccessKey, sessionToken };
}

function extFromName(name: string) {
  const raw = (name.split(".").pop() || "").toLowerCase();
  return raw === "jpeg" ? "jpg" : raw || "jpg";
}
function makeKey(name: string, hash: string) {
  return `images/${hash}.${extFromName(name)}`;
}

async function handler(req: NextRequest) {
  try {
    const form = await req.formData();

    // Accept single 'file' and/or multiple 'files'
    const picked: File[] = [];
    const single = form.get("file");
    if (single instanceof File) picked.push(single);
    const many = form.getAll("files");
    for (const v of many) if (v instanceof File) picked.push(v);

    if (!picked.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // STS assume once
    const assumed = await assumeRole();
    const credentials = toAwsIdentity(assumed);
    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;
    const s3 = new S3Client({ region: Region, credentials });

    // Load or init index
    const currentWrap = await getJson<ImagesIndex>(
      INDEX_KEY,
      credentials
    ).catch(() => null);
    const index = currentWrap?.body ?? emptyIndex();

    // intra-batch dedup
    const batchHashes = new Set<string>();
    const indexUpdates: {
      hash: string;
      key: string;
      name: string;
      size: number;
    }[] = [];
    const results: Array<{
      name: string;
      size: number;
      type: string;
      hash?: string;
      key?: string;
      status: "uploaded" | "duplicate" | "skipped" | "error";
      message?: string;
    }> = [];

    for (const f of picked) {
      const base = {
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
      };

      // Validate type/size
      if (!ALLOWED_TYPES.has(f.type || "")) {
        results.push({
          ...base,
          status: "skipped",
          message: "Unsupported type",
        });
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        results.push({
          ...base,
          status: "skipped",
          message: `Too large (> ${MAX_FILE_MB}MB)`,
        });
        continue;
      }

      // Read once → buffer; use it for both hash and upload
      const ab = await f.arrayBuffer();
      const buf = Buffer.from(ab);

      // Hash on server
      const hash = createHash("sha256").update(buf).digest("hex");

      // Intra-batch dedup
      if (batchHashes.has(hash)) {
        results.push({
          ...base,
          hash,
          status: "duplicate",
          message: "Duplicate in batch",
        });
        continue;
      }
      batchHashes.add(hash);

      // Index dedup
      const existing = index.images?.[hash];
      if (existing) {
        results.push({
          ...base,
          hash,
          key: existing.key,
          status: "duplicate",
          message: "Already exists",
        });
        continue;
      }

      // Upload from server to S3 (buffered + explicit ContentLength)
      const key = makeKey(f.name, hash);
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket,
            Key: key,
            Body: buf,
            ContentType: f.type || "application/octet-stream",
            ContentLength: buf.length, // <= important for S3
          })
        );

        indexUpdates.push({ hash, key, name: f.name, size: f.size });
        results.push({ ...base, hash, key, status: "uploaded" });
      } catch (e: any) {
        results.push({
          ...base,
          hash,
          status: "error",
          message: e?.message || "Upload failed",
        });
      }
    }

    if (indexUpdates.length) {
      for (const u of indexUpdates) {
        index.images[u.hash] = { key: u.key, name: u.name, size: u.size };
      }
      await putJson(INDEX_KEY, index, undefined, credentials);
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload error" }, { status: 500 });
  }
}

export const POST = withMiddleware(handler);
