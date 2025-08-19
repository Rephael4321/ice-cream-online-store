import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

type SortKey = "name" | "updated" | "size";
type SortOrder = "asc" | "desc";

function normalizeImagePath(img: string): string {
  if (!img) return "";
  try {
    if (img.startsWith("http")) {
      const u = new URL(img);
      return u.pathname.replace(/^\/+/, "");
    }
    return img.replace(/^\/+/, "");
  } catch {
    return img;
  }
}

async function listUnusedImages(req: NextRequest) {
  try {
    // 0) sort params
    const { searchParams } = new URL(req.url);
    const sort = (searchParams.get("sort") || "updated") as SortKey;
    const order = (searchParams.get("order") || "desc") as SortOrder;

    // 1) S3 client
    const credentials = await assumeRole();
    const Bucket = process.env.MEDIA_BUCKET!;
    const Region = process.env.AWS_REGION!;
    const s3 = new S3Client({ region: Region, credentials });

    // 2) Load image index (for display names)
    const nameByKey = new Map<string, string>();
    try {
      const idx = await s3.send(
        new GetObjectCommand({ Bucket, Key: "images-index.json" })
      );
      const text = await idx.Body?.transformToString();
      const json = text ? JSON.parse(text) : {};
      const imagesSection =
        json?.images && typeof json.images === "object" ? json.images : {};
      for (const hash of Object.keys(imagesSection)) {
        const rec = imagesSection[hash];
        if (rec?.key && rec?.name) nameByKey.set(rec.key, rec.name);
      }
    } catch {
      // No index is fine — fallback to filename below
    }

    // 3) List S3 objects (images/)
    const objectsResp = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix: "images/",
      })
    );

    const s3Objects =
      objectsResp.Contents?.map((o) => {
        const key = o.Key!;
        const displayName = nameByKey.get(key) ?? (key.split("/").pop() || key);
        return {
          key,
          name: displayName,
          size: o.Size ?? 0,
          updated_at: o.LastModified?.toISOString() ?? null,
          url: `https://${Bucket}.s3.amazonaws.com/${encodeURI(key)}`,
        };
      }) || [];

    // 4) Used product images
    const products = await db.query<{ image: string | null }>(
      `SELECT image FROM products WHERE image IS NOT NULL`
    );
    const usedKeys = new Set(
      products.rows.map((r) => normalizeImagePath(r.image!))
    );

    // 5) Filter unused
    let unused = s3Objects.filter(
      (obj) => !usedKeys.has(normalizeImagePath(obj.key))
    );

    // 6) Sort
    unused = unused.sort((a, b) => {
      const nameA = (a.name || a.key).toLowerCase();
      const nameB = (b.name || b.key).toLowerCase();
      const updatedA = new Date(a.updated_at || 0).getTime();
      const updatedB = new Date(b.updated_at || 0).getTime();

      let vA: number | string;
      let vB: number | string;

      switch (sort) {
        case "name":
          vA = nameA;
          vB = nameB;
          break;
        case "size":
          vA = a.size;
          vB = b.size;
          break;
        case "updated":
        default:
          vA = updatedA;
          vB = updatedB;
          break;
      }
      const cmp = vA < vB ? -1 : vA > vB ? 1 : 0;
      return order === "asc" ? cmp : -cmp;
    });

    return NextResponse.json({ images: unused });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const GET = withMiddleware(listUnusedImages);
