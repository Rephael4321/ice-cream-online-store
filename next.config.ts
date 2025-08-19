import type { NextConfig } from "next";

const BUCKET = process.env.MEDIA_BUCKET || "ice-cream-online-store";
const REGION = process.env.AWS_REGION || "us-east-1";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true }, // ✅ disables type checking during `next build`
  eslint: { ignoreDuringBuilds: true }, // ✅ disables ESLint during `next build`
  images: {
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
