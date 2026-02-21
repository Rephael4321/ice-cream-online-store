/**
 * Base URL for server-side fetch (must be absolute).
 * Fallback when NEXT_PUBLIC_SITE_URL is unset (e.g. local dev without .env).
 */
export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}
