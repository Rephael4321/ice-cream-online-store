import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true, // ✅ disables type checking during `next build`
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ disables ESLint during `next build`
  },
};

export default nextConfig;
