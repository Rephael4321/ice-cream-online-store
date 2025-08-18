import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { assumeRole } from "@/lib/aws/assume-role";
import db from "@/lib/db";

async function listUnusedImages(req: NextRequest) {
  try {
    // 1. Assume role to list objects
    const creds = await assumeRole();
    const bucket = process.env.MEDIA_BUCKET!;
    const region = process.env.AWS_REGION!;
    const s3 = new S3Client({ region, credentials: creds });

    // 2. List all objects in S3
    const objectsResp = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "images/", // only images/
      })
    );

    const s3Objects =
      objectsResp.Contents?.map((o) => ({
        key: o.Key!,
        size: o.Size ?? 0,
        updated_at: o.LastModified?.toISOString() ?? null,
        url: `https://${bucket}.s3.amazonaws.com/${o.Key}`, // ✅ full usable URL
      })) || [];

    // 3. Get all product image keys from DB
    const products = await db.query<{ image: string | null }>(`
      SELECT image FROM products WHERE image IS NOT NULL
    `);
    const usedKeys = new Set(products.rows.map((r) => r.image!));

    // 4. Keep only unused images
    let unused = s3Objects.filter((obj) => !usedKeys.has(obj.key));

    // 5. Sorting (query params ?sort=name|size|updated, ?order=asc|desc)
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "updated";
    const order = searchParams.get("order") || "desc";

    unused = unused.sort((a, b) => {
      let valA: any, valB: any;
      switch (sort) {
        case "name":
          valA = a.key.toLowerCase();
          valB = b.key.toLowerCase();
          break;
        case "size":
          valA = a.size;
          valB = b.size;
          break;
        case "updated":
        default:
          valA = new Date(a.updated_at || 0).getTime();
          valB = new Date(b.updated_at || 0).getTime();
          break;
      }
      if (order === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return NextResponse.json({ images: unused });
  } catch (err) {
    console.error("Failed to list unused images:", err);
    return NextResponse.json(
      { error: "Failed to list unused images" },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(listUnusedImages);
