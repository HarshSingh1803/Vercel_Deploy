import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(
  root,
  "node_modules/mediainfo.js/dist/MediaInfoModule.wasm",
);

const targets = [
  join(root, "node_modules/mediainfo.js/dist/esm-bundle/MediaInfoModule.wasm"),
  join(root, "node_modules/mediainfo.js/dist/esm/MediaInfoModule.wasm"),
  join(root, "public/wasm/MediaInfoModule.wasm"),
];

if (!existsSync(source)) {
  console.warn("MediaInfo WASM not found; skip copy.");
  process.exit(0);
}

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
