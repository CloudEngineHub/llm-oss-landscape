import type { NextConfig } from "next";
import path from "node:path";

const monorepoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "10.71.15.140"],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/*": ["../../data/agentic-ai-projects.csv"],
  },
  turbopack: {
    root: monorepoRoot,
  },
  async headers() {
    return [
      {
        source: "/project-logos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=31536000",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=31536000",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "github.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
