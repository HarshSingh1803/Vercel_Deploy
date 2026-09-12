import { spawn } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const chrome =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

async function fetchOk(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  const html = await res.text();
  return html;
}

const routes = ["/", "/clean", "/login", "/signup", "/privacy", "/dashboard"];
for (const path of routes) {
  const html = await fetchOk(path);
  if (html.includes("Maximum update depth exceeded")) {
    throw new Error(`${path} HTML contains the infinite-loop error`);
  }
  console.log(`GET ${path} ${html.includes("GET-RISE") ? "ok" : "ok (no brand in payload)"}`);
}

if (!existsSync(chrome)) {
  console.log("Chrome not found; skipped DOM dump.");
  process.exit(0);
}

const dump = await run(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--user-data-dir=" + join(tmpdir(), "get-rise-e2e"),
  "--virtual-time-budget=8000",
  "--timeout=15000",
  "--dump-dom",
  `${BASE}/clean`,
]);

if (dump.code !== 0 && !dump.out.includes("<html")) {
  console.error(dump.err.slice(0, 1500));
  throw new Error(`Chrome dump failed with code ${dump.code}`);
}

const dom = dump.out;
const checks = [
  "Instagram Downloader",
  "Submission Import",
  "Local Video Cleaner",
  "Publishing & Library",
  "Connected Instagram accounts",
  "Default caption",
];
const missing = checks.filter((item) => !dom.includes(item));
if (dom.includes("Maximum update depth exceeded")) {
  throw new Error("Infinite loop still present in rendered DOM");
}
if (missing.length) {
  console.log("DOM snippet length", dom.length);
  writeFileSync("/tmp/get-rise-clean.html", dom);
  throw new Error("Missing in /clean DOM: " + missing.join(", "));
}

console.log("browser DOM checks passed");
