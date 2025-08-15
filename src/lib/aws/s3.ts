import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

const BUCKET = process.env.MEDIA_BUCKET as string;
const REGION = process.env.AWS_REGION || "us-east-1";

export function makeS3(credentials?: AwsCredentialIdentity) {
  return new S3Client({ region: REGION, credentials });
}

export type GetJsonResult<T> = { body: T; etag?: string };

export async function getJson<T = any>(
  key: string,
  credentials?: AwsCredentialIdentity
): Promise<GetJsonResult<T> | undefined> {
  const s3 = makeS3(credentials);
  try {
    const out = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key })
    );
    const text = await (out.Body as any).transformToString();
    const etag = out.ETag?.replace(/"/g, "");
    return { body: JSON.parse(text) as T, etag };
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) return undefined;
    throw err;
  }
}

export async function putJson(
  key: string,
  obj: any,
  ifMatchEtag?: string,
  credentials?: AwsCredentialIdentity
) {
  const s3 = makeS3(credentials);
  const Body = Buffer.from(JSON.stringify(obj, null, 2), "utf-8");
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body,
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store",
      ...(ifMatchEtag ? { IfMatch: ifMatchEtag } : {}),
    })
  );
}

export async function headEtag(
  key: string,
  credentials?: AwsCredentialIdentity
): Promise<string | undefined> {
  const s3 = makeS3(credentials);
  try {
    const out = await s3.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    );
    return out.ETag?.replace(/"/g, "");
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) return undefined;
    throw err;
  }
}
