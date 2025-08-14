import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";

function sanitizeBase(name: string) {
  return name
    .trim()
    .replace(/[\\/]+/g, "")
    .replace(/\s+/g, " ");
}

async function renameImage(req: NextRequest) {
  try {
    const { imageUrl, newBaseName } = await req.json();
    if (!imageUrl || !newBaseName) {
      return NextResponse.json(
        { error: "Missing imageUrl or newBaseName" },
        { status: 400 }
      );
    }

    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;

    const oldKey = decodeURIComponent(new URL(imageUrl).pathname.slice(1)); // e.g. images/foo.png
    if (!oldKey.startsWith("images/")) {
      return NextResponse.json(
        { error: "Can only rename items under images/" },
        { status: 400 }
      );
    }

    const oldFileName = oldKey.split("/").pop()!;
    const dotIdx = oldFileName.lastIndexOf(".");
    const ext = dotIdx >= 0 ? oldFileName.slice(dotIdx + 1) : "";
    const base = sanitizeBase(newBaseName);
    if (!base)
      return NextResponse.json({ error: "Invalid new name" }, { status: 400 });

    const newKey = `images/${ext ? `${base}.${ext}` : base}`;
    if (newKey === oldKey) {
      return NextResponse.json({ success: true, fileUrl: imageUrl });
    }

    const credentials = await assumeRole();
    const s3 = new S3Client({ region: Region, credentials });

    // Avoid overwriting an existing object with the same name
    try {
      await s3.send(new HeadObjectCommand({ Bucket, Key: newKey }));
      return NextResponse.json(
        { error: "A file with that name already exists" },
        { status: 409 }
      );
    } catch {
      // HeadObject 404 → continue
    }

    await s3.send(
      new CopyObjectCommand({
        Bucket,
        CopySource: `/${Bucket}/${encodeURI(oldKey)}`,
        Key: newKey,
        MetadataDirective: "COPY",
      })
    );

    await s3.send(new DeleteObjectCommand({ Bucket, Key: oldKey }));

    const fileUrl = `https://${Bucket}.s3.amazonaws.com/${encodeURI(newKey)}`;
    return NextResponse.json({ success: true, fileUrl });
  } catch (err) {
    console.error("Rename failed:", err);
    return NextResponse.json({ error: "Rename failed" }, { status: 500 });
  }
}

export const POST = withMiddleware(renameImage);
