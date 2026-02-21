import type { NextConfig } from "next";

const BUCKET = process.env.MEDIA_BUCKET || "ice-cream-online-store";
const REGION = process.env.AWS_REGION || "us-east-1";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  // eslint: no longer configurable here in Next.js 16; use eslint.config.js or CLI
  images: {
    // Next.js 16: allow local images (public folder + img-proxy)
    localPatterns: [
      { pathname: "/api/img-proxy" },
      { pathname: "/**" }, // public folder: /favicon_io/..., /icons/..., /popsicle.png, etc.
    ],
    remotePatterns: [
      // Non-region host (worked before)
      {
        protocol: "https",
        hostname: `${BUCKET}.s3.amazonaws.com`,
        pathname: "/**",
      },
      // Regioned host (what the API may return now)
      {
        protocol: "https",
        hostname: `${BUCKET}.s3.${REGION}.amazonaws.com`,
        pathname: "/**",
      },
      // Optional: Transfer Acceleration (safe to keep if you turn it on later)
      {
        protocol: "https",
        hostname: `${BUCKET}.s3-accelerate.amazonaws.com`,
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
