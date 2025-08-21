import {
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import type { AwsCredentialIdentity } from "@aws-sdk/types";
import { makeS3, getJson } from "@/lib/aws/s3";

export type ImagesIndex = {
  version: number;
  images: Record<
    string,
    {
      key: string;
      name?: string;
      size?: number;
    }
  >;
};

export type S3Row = { key: string; size: number; updatedMs: number };

export const INDEX_KEY = "images-index.json";
const INDEX_TTL_MS = 30_000;
const LISTING_TTL_MS = 60_000;

const BUCKET = process.env.MEDIA_BUCKET || "";

export function emptyIndex(): ImagesIndex {
  return { version: 1, images: {} };
}

let _indexCache: { at: number; data: ImagesIndex } | null = null;

export async function getImageIndex(
  credentials?: AwsCredentialIdentity
): Promise<ImagesIndex> {
  const now = Date.now();
  if (_indexCache && now - _indexCache.at < INDEX_TTL_MS) {
    return _indexCache.data;
  }
  try {
    const res = await getJson<ImagesIndex>(INDEX_KEY, credentials);
    const data = res?.body ?? emptyIndex();
    _indexCache = { at: now, data };
    return data;
  } catch {
    const fallback = emptyIndex();
    _indexCache = { at: now, data: fallback };
    return fallback;
  }
}

const listingCache = new Map<string, { at: number; rows: S3Row[] }>();

export async function getS3ObjectsCached(
  prefix = "images/",
  credentials?: AwsCredentialIdentity
): Promise<S3Row[]> {
  const now = Date.now();
  const cacheKey = prefix;
  const cached = listingCache.get(cacheKey);
  if (cached && now - cached.at < LISTING_TTL_MS) {
    return cached.rows;
  }

  if (!BUCKET) {
    throw new Error("MEDIA_BUCKET env var is missing");
  }

  const s3 = makeS3(credentials);
  const rows: S3Row[] = [];
  let ContinuationToken: string | undefined = undefined;

  do {
    const out: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken,
        MaxKeys: 1000,
      })
    );

    for (const obj of out.Contents ?? []) {
      if (!obj.Key) continue;
      rows.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        updatedMs: obj.LastModified ? obj.LastModified.getTime() : 0,
      });
    }

    ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (ContinuationToken);

  listingCache.set(cacheKey, { at: now, rows });
  return rows;
}
