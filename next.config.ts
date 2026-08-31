import type { NextConfig } from "next";
import path from "path";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // Keep resolution inside this app (parent folders can confuse Turbopack).
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
    // Must be a relative path — absolute Windows paths fail with
    // "windows imports are not implemented yet".
    resolveAlias: {
      tailwindcss: "./node_modules/tailwindcss",
    },
  },
  webpack: (config, { dev }) => {
    // pdfjs-dist 5.x is incompatible with Webpack's eval-* source maps in
    // development, which causes "Object.defineProperty called on non-object".
    if (dev) {
      config.devtool = 'source-map';
      config.plugins = config.plugins.filter(
        (plugin: unknown) =>
          (plugin as { constructor?: { name?: string } })?.constructor?.name !==
          'EvalSourceMapDevToolPlugin'
      );
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-nexlink.s3.us-east-2.amazonaws.com",
      },
    ],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
