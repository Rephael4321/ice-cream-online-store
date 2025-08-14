import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // ✅ disables type checking during `next build`
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ disables ESLint during `next build`
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ice-cream-online-store.s3.amazonaws.com",
        pathname: "/**", // allow all paths under the bucket
      },
    ],
  },
};

export default nextConfig;
