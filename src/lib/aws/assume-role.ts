import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

type Cached = {
  creds: AwsCredentialIdentity;
  refreshAt: number; // unix ms timestamp when we should refresh
};

let cache: Cached | null = null;

const REFRESH_SLOP_MS = 60_000; // 60s

function now() {
  return Date.now();
}

export async function assumeRole(): Promise<AwsCredentialIdentity> {
  // Reuse cached credentials if still valid
  if (cache && cache.refreshAt > now()) {
    return cache.creds;
  }

  const region = process.env.AWS_REGION!;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;
  const roleArn = process.env.CLIENT_ROLE_ARN!;
  const externalId = process.env.ASSUME_ROLE_EXTERNAL_ID!;
  const sessionName = "image-upload-session";

  if (!region || !accessKeyId || !secretAccessKey || !roleArn || !externalId) {
    throw new Error("Missing required AWS env vars for assumeRole()");
  }

  const sts = new STSClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const resp = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: sessionName,
      ExternalId: externalId,
      DurationSeconds: 900, // 15 minutes
    })
  );

  const c = resp.Credentials;
  if (
    !c?.AccessKeyId ||
    !c.SecretAccessKey ||
    !c.SessionToken ||
    !c.Expiration
  ) {
    throw new Error("Failed to assume role: missing credentials");
  }

  const creds: AwsCredentialIdentity = {
    accessKeyId: c.AccessKeyId,
    secretAccessKey: c.SecretAccessKey,
    sessionToken: c.SessionToken,
  };

  // Refresh a bit before actual expiration
  const refreshAt = new Date(c.Expiration).getTime() - REFRESH_SLOP_MS;
  cache = { creds, refreshAt };

  // single, helpful print (no secrets)
  // console.log(
  //   "[assumeRole] assumed:",
  //   roleArn,
  //   "expires:",
  //   new Date(c.Expiration).toISOString()
  // );

  return creds;
}

export function clearAssumedRoleCache() {
  cache = null;
}
