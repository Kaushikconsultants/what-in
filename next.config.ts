import type { NextConfig } from "next";

const nextConfig: any = {
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      allowedOrigins: ["whatsapp.esponsports.com", "*.railway.app", "localhost:3000"]
    }
  }
};

export default nextConfig;
