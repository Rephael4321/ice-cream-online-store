"use client";
import { useEffect, useMemo, useState } from "react";

type Item = {
  db_path: string;
  current_source: "vercel" | "s3";
  vercel_path: string;

  sha256_vercel?: string | null;
  sha256_s3?: string | null;
  hash_match?: boolean;

  s3_key?: string | null;
  s3_url?: string | null;
  size_s3?: number | null;

  tables?: string[];
  count_by_table?: Record<string, number>;
  last_flip_at?: string | null;
  history?: { at: string; action: string; note?: string }[];
};

type Manifest = {
  version: number;
  updated_at?: string;
  items: Record<string, Item>;
};

type ByTable = {
  products: string[];
  categories: string[];
  sale_groups: string[];
  order_items: string[];
};

type CollectResp = {
  manifest: Manifest;
  byTable: ByTable;
  totals?: Record<string, number>;
};

export default function Page() {
  const [data, setData] = useState<CollectResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/migration/images/collect", {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(await r.text());
      const json = (await r.json()) as CollectResp;
      setData(json);
    } catch (e: any) {
      setErr(e?.message || "load failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    if (!data) return null;
    const m = data.manifest.items;
    const tables = [
      "products",
      "categories",
      "sale_groups",
      "order_items",
    ] as const;
    const out: Record<(typeof tables)[number], Item[]> = {
      products: [],
      categories: [],
      sale_groups: [],
      order_items: [],
    };
    for (const t of tables) {
      const paths = new Set<string>(data.byTable[t].map((p) => p));
      out[t] = Array.from(paths)
        .map((p) => m[p])
        .filter((x): x is Item => Boolean(x));
    }
    return out;
  }, [data]);

  const flip = async (db_path: string, to: "vercel" | "s3") => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/migration/images/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ db_path, to }),
      });
      if (!r.ok) throw new Error(await r.text());
      await load();
    } catch (e: any) {
      setErr(e?.message || "flip failed");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="p-6">{busy ? "Loading…" : err}</div>;

  const Section = ({ title, items }: { title: string; items: Item[] }) => (
    <div className="border rounded-xl p-4 space-y-3">
      <h2 className="text-lg font-semibold">
        {title} <span className="text-sm text-gray-500">({items.length})</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((it) => {
          const shortHash = it.sha256_vercel
            ? it.sha256_vercel.slice(0, 10)
            : "—";
          const canUseS3 = !!it.hash_match && !!it.s3_url;

          return (
            <div key={it.db_path} className="border rounded-lg p-3">
              <div className="text-sm font-mono truncate">{it.db_path}</div>

              {/* previews */}
              <div className="mt-2 grid grid-cols-2 gap-3">
                {/* Vercel preview */}
                <div className="border rounded-md p-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                    <span>Vercel</span>
                    <a
                      href={it.vercel_path}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      open
                    </a>
                  </div>
                  <div className="relative w-full aspect-square bg-gray-50 rounded overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.vercel_path}
                      alt="vercel preview"
                      className="object-contain w-full h-full"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                </div>

                {/* S3 preview */}
                <div className="border rounded-md p-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                    <span>S3 {it.hash_match ? "✅" : "❌"}</span>
                    {it.s3_url ? (
                      <a
                        href={it.s3_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        open
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                  <div className="relative w-full aspect-square bg-gray-50 rounded overflow-hidden">
                    {it.s3_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.s3_url}
                        alt="s3 preview"
                        className="object-contain w-full h-full"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        no s3 match
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* meta */}
              <div className="text-xs text-gray-500 mt-2">
                Source: <b>{it.current_source.toUpperCase()}</b>
                {" • "}Hash: {shortHash}
                {" • "}Match: {it.hash_match ? "✅" : "❌"}
              </div>

              {/* actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => flip(it.db_path, "vercel")}
                  disabled={busy || it.current_source === "vercel"}
                  className={`px-2 py-1 rounded text-xs ${
                    it.current_source === "vercel"
                      ? "bg-gray-800 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Use Vercel
                </button>

                <button
                  onClick={() => flip(it.db_path, "s3")}
                  disabled={busy || it.current_source === "s3" || !canUseS3}
                  title={
                    !canUseS3 ? "Requires a verified hash match in S3" : ""
                  }
                  className={`px-2 py-1 rounded text-xs ${
                    it.current_source === "s3"
                      ? "bg-green-600 text-white"
                      : canUseS3
                      ? "bg-green-500 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Use S3
                </button>
              </div>

              {it.count_by_table && (
                <div className="mt-2 text-[11px] text-gray-500">
                  {Object.entries(it.count_by_table).map(([t, c]) => (
                    <span key={t} className="mr-2">
                      {t}: {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div dir="rtl" className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Migration Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={busy}
            className="px-3 py-2 rounded bg-gray-200"
          >
            Reload
          </button>
        </div>
      </div>

      {err && <p className="text-red-600">{err}</p>}

      {groups && (
        <>
          <Section title="Products" items={groups.products} />
          <Section title="Categories" items={groups.categories} />
          <Section title="Sale Groups" items={groups.sale_groups} />
          <Section title="Order Items" items={groups.order_items} />
        </>
      )}
    </div>
  );
}
