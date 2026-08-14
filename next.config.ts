import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn-nexlink.s3.us-east-2.amazonaws.com',
      },
    ],
    unoptimized: true,
  },
  // Allow larger file uploads (200MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
};

export default nextConfig;
