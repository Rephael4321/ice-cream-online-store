"use client";
import { useEffect } from "react";

/**
 * Listens for <img> load errors coming from Next's optimizer (/ _next/image).
 * When one fails, it "warms" the inner URL (our proxy) and retries the optimizer once.
 */

// Tweakables:
const RETRY_DELAY_MS = 1200; // wait ~1.2s after warm (increase if needed)
const JITTER_MS = 400; // add small random jitter to avoid stampede

export default function GlobalImageRetry() {
  useEffect(() => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const onError = async (ev: Event) => {
      const el = ev.target as HTMLElement;
      if (!(el instanceof HTMLImageElement)) return;

      // Only handle Next optimizer images
      const src = el.src || "";
      if (!src.includes("/_next/image")) return;

      // Avoid infinite loops — retry only once
      if (el.dataset.retried === "1") return;

      try {
        const outer = new URL(src, window.location.origin);
        const innerParam = outer.searchParams.get("url"); // after middleware rewrite: /api/img-proxy?url=...

        // Warm the proxy/origin (best effort)
        if (innerParam) {
          const innerAbs = new URL(
            innerParam,
            window.location.origin
          ).toString();
          try {
            await fetch(innerAbs, { cache: "no-store" });
          } catch {
            /* ignore warm errors */
          }
        }

        // Wait a bit so the proxy/edge cache settles
        const jitter = Math.floor(Math.random() * JITTER_MS);
        await sleep(RETRY_DELAY_MS + jitter);

        // Retry optimizer with a cache-buster so it doesn't reuse the failed 500
        outer.searchParams.set("cb", Date.now().toString());
        el.dataset.retried = "1";
        el.src = outer.toString();
      } catch {
        /* ignore */
      }
    };

    // Capture phase required to catch resource load errors
    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);

  return null;
}
