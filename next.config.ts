import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@ffmpeg/ffmpeg", "@ffmpeg/util", "mediainfo.js"],
  transpilePackages: ["xlsx"],
  turbopack: {
    rules: {
      "*.wasm": {
        type: "asset",
      },
    },
    resolveAlias: {
      "MediaInfoModule.wasm": path.join(
        process.cwd(),
        "public/wasm/MediaInfoModule.wasm",
      ),
      xlsx: path.join(process.cwd(), "node_modules/xlsx/xlsx.mjs"),
    },
  },
};

export default nextConfig;
