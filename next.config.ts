import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: ["what-inn.tikal.in", "*.railway.app", "localhost:3000"]
    }
  }
};

export default nextConfig;
