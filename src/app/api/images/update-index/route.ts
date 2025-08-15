import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import { assumeRole } from "@/lib/aws/assume-role";
import { getJson, putJson } from "@/lib/aws/s3";
import { INDEX_KEY, emptyIndex, ImagesIndex } from "@/lib/aws/images-index";

type Entry = { hash: string; key: string; name?: string; size?: number };

function validateEntries(entries: any): Entry[] {
  if (!Array.isArray(entries)) throw new Error("entries must be an array");
  const out: Entry[] = [];

  for (const e of entries) {
    const hash = String(e?.hash || "");
    const key = String(e?.key || "");
    if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error(`invalid hash: ${hash}`);
    if (!key.startsWith("images/"))
      throw new Error(`key must start with "images/": ${key}`);
    const name = e?.name ? String(e.name) : undefined;
    const size = e?.size != null ? Number(e.size) : undefined;
    out.push({ hash: hash.toLowerCase(), key, name, size });
  }

  // de-dupe same-hash entries within one request (keep first)
  const seen = new Set<string>();
  return out.filter((e) =>
    seen.has(e.hash) ? false : (seen.add(e.hash), true)
  );
}

function merge(
  base: ImagesIndex,
  entries: Entry[]
): { next: ImagesIndex; added: number } {
  const next: ImagesIndex = { ...base, images: { ...base.images } };
  let added = 0;
  for (const e of entries) {
    if (!next.images[e.hash]) {
      next.images[e.hash] = { key: e.key, name: e.name, size: e.size };
      added++;
    }
  }
  return { next, added };
}

async function postHandler(req: NextRequest) {
  try {
    const { entries } = await req.json();
    const parsed = validateEntries(entries);

    // Assume once; use for all S3 JSON ops
    const assumed = await assumeRole();
    const credentials = {
      accessKeyId: assumed.accessKeyId,
      secretAccessKey: assumed.secretAccessKey,
      sessionToken: assumed.sessionToken,
    };

    let attempts = 0;
    let addedTotal = 0;

    while (true) {
      attempts++;

      const curWrap = await getJson<ImagesIndex>(INDEX_KEY, credentials).catch(
        () => null
      );
      const cur = curWrap ?? { body: emptyIndex(), etag: undefined };

      if (!curWrap) {
        // create empty index so subsequent reads have an ETag
        await putJson(INDEX_KEY, cur.body, undefined, credentials);
      }

      const { next, added } = merge(cur.body, parsed);
      addedTotal = added;

      try {
        await putJson(INDEX_KEY, next, curWrap?.etag, credentials);
        break;
      } catch (err: any) {
        const status = err?.$metadata?.httpStatusCode;
        const code = err?.name || err?.Code;
        if ((status === 412 || code === "PreconditionFailed") && attempts < 5)
          continue;
        throw err;
      }
    }

    return NextResponse.json({ ok: true, added: addedTotal });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "failed to update index" },
      { status: 400 }
    );
  }
}

export const POST = withMiddleware(postHandler);
