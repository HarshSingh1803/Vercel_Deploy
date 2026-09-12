import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "mediainfo.js"],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,

      "MediaInfoModule.wasm": path.resolve(
        process.cwd(),
        "public",
        "wasm",
        "MediaInfoModule.wasm",
      ),
    };

    return config;
  },
};

export default nextConfig;
