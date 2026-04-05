/**
 * Dev-only: decode percent-encoded paths/query in Next.js incoming-request log lines
 * so Hebrew (and other non-ASCII) shows readably in the terminal.
 */

const HTTP_METHOD_RE =
  /(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) (\S+)(?= (\d|\u001b))/;

/**
 * Decodes pathname and query string for display. For typical `url=` params
 * (e.g. img-proxy), URLSearchParams already decodes the param value once.
 */
export function decodeIncomingRequestUrlForDisplay(pathAndQuery: string): string {
  if (!pathAndQuery.includes("%")) return pathAndQuery;

  const q = pathAndQuery.indexOf("?");
  const rawPath = q === -1 ? pathAndQuery : pathAndQuery.slice(0, q);
  const rawQuery = q === -1 ? "" : pathAndQuery.slice(q + 1);

  let pathOut: string;
  try {
    pathOut = decodeURIComponent(rawPath);
  } catch {
    pathOut = rawPath;
  }

  if (!rawQuery) return pathOut;

  try {
    const sp = new URLSearchParams(rawQuery);
    const parts: string[] = [];
    sp.forEach((v, k) => {
      parts.push(`${k}=${v}`);
    });
    return `${pathOut}?${parts.join("&")}`;
  } catch {
    return `${pathOut}?${rawQuery}`;
  }
}

export function transformDevIncomingRequestLogLine(line: string): string {
  const m = line.match(HTTP_METHOD_RE);
  if (!m || m.index === undefined) return line;
  const method = m[1];
  const url = m[2];
  const decoded = decodeIncomingRequestUrlForDisplay(url);
  if (decoded === url) return line;
  return (
    line.slice(0, m.index) +
    `${method} ${decoded}` +
    line.slice(m.index + m[0].length)
  );
}

let decoderInstalled = false;

export function installDevRequestLogDecoder(): void {
  if (decoderInstalled) return;
  decoderInstalled = true;

  let pending = "";
  const orig = process.stdout.write.bind(process.stdout);

  process.stdout.write = function (
    chunk: string | Uint8Array,
    encodingOrCb?: BufferEncoding | ((err?: Error) => void),
    cb?: (err?: Error) => void
  ): boolean {
    const s =
      typeof chunk === "string"
        ? chunk
        : Buffer.isBuffer(chunk)
          ? chunk.toString("utf8")
          : Buffer.from(chunk).toString("utf8");

    pending += s;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    let out = "";
    for (const line of lines) {
      out += transformDevIncomingRequestLogLine(line) + "\n";
    }

    const callback =
      typeof encodingOrCb === "function" ? encodingOrCb : cb;

    if (!out) {
      if (callback) queueMicrotask(() => callback());
      return true;
    }

    const enc =
      typeof encodingOrCb === "string" ? encodingOrCb : ("utf8" as BufferEncoding);

    return orig(out, enc, callback as () => void);
  };
}
