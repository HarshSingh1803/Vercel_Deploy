import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const chrome =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function fail(message, extra = "") {
  console.error(message);
  if (extra) console.error(extra.slice(0, 2000));
  process.exit(1);
}

const videoPath = join(tmpdir(), "get-rise-e2e.mp4");
const csvPath = join(tmpdir(), "get-rise-e2e.csv");
writeFileSync(
  csvPath,
  "title,url,caption\nLaunch,https://example.com/a.mp4,Hello GET-RISE\n",
);

const ffmpeg = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc=duration=1:size=320x240:rate=15",
    "-pix_fmt",
    "yuv420p",
    videoPath,
  ],
  { encoding: "utf8" },
);
if (ffmpeg.status !== 0) {
  fail("Could not create test video", ffmpeg.stderr || ffmpeg.stdout);
}

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
});
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));

async function clickTab(name) {
  await page.getByRole("button", { name }).click();
}

try {
  const started = await fetch(`${BASE}/api/fetch-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "https://www.instagram.com/reel/testrun/" }),
  });
  const startedType = started.headers.get("content-type") || "";
  if (startedType.startsWith("video/")) {
    fail("Instagram URLs must not stream as a direct file");
  }
  if (started.ok) {
    const payload = await started.json();
    if (!payload.jobId) fail("Instagram download should return a jobId");
    console.log("instagram job started", payload.jobId);
  } else {
    console.log("instagram job start skipped:", await started.text());
  }
  const sample = await fetch(`${BASE}/api/fetch-video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    }),
  });
  if (!sample.ok) {
    console.log("sample mp4 download skipped:", await sample.text());
  } else {
    const buf = Buffer.from(await sample.arrayBuffer());
    if (buf.length < 1000) fail("Downloaded sample was too small");
    console.log("direct mp4 download ok", buf.length, "bytes");
  }

  await page.goto(`${BASE}/clean`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: /Publishing & Library/i }).waitFor({ timeout: 15000 });
  if (pageErrors.some((item) => item.includes("Maximum update depth"))) {
    fail("Infinite loop still present", pageErrors.join("\n"));
  }

  await page.getByText("Connected Instagram accounts").waitFor();
  await page.getByPlaceholder(/default caption/i).fill("Rise with GET-RISE #testrun");
  await page.getByRole("button", { name: "Save default caption" }).click();
  await page.getByText("Default caption saved on this device.").waitFor();

  await clickTab("Instagram Downloader");
  await page
    .getByPlaceholder(/instagram.com\/reel/i)
    .fill("https://www.instagram.com/reel/testrun/");
  await page.locator("form").getByRole("button", { name: "Download" }).click();
  await page.getByRole("button", { name: /Downloading/i }).waitFor();

  await clickTab("Submission Import");
  await page.locator('input[accept*=".csv"]').first().setInputFiles(csvPath);
  await page.getByText(/rows imported/i).waitFor();
  await page.getByText("Launch").waitFor();

  await clickTab("Local Video Cleaner");
  await page.getByText(/Drop a video to inspect metadata/i).waitFor();
  await page.locator('input[type="file"][accept*="video/mp4"]').first().setInputFiles(videoPath);
  await page.getByText("Video metadata", { exact: false }).first().waitFor({ timeout: 30000 });
  await page.getByText(/fields found/i).waitFor({ timeout: 30000 });

  await clickTab("Publishing & Library");
  await page.getByText("Connected Instagram accounts").waitFor();

  if (pageErrors.length) {
    fail("Browser page errors", pageErrors.join("\n"));
  }
  console.log("end-to-end workspace tests passed");
} catch (error) {
  const html = await page.content().catch(() => "");
  fail(error instanceof Error ? error.message : String(error), html);
} finally {
  await browser.close();
}
