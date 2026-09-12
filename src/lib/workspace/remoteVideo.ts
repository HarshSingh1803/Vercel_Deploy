import { MAX_FILE_BYTES, SUPPORTED_EXTENSIONS } from "@/lib/video/constants";
import { isDirectVideoUrl, isSocialVideoPage } from "@/lib/workspace/parse";

const BLOCKED_HOST_PARTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "169.254.169.254",
  "metadata.google.internal",
];

function hostBlocked(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return BLOCKED_HOST_PARTS.some(
    (part) => host === part || host.endsWith(`.${part}`),
  );
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export function assertPublicHttpUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("That is not a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http and https video links are allowed.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs with credentials are not allowed.");
  }
  if (hostBlocked(parsed.hostname)) {
    throw new Error("Local and internal network addresses cannot be fetched.");
  }
  return parsed;
}

export function assertRemoteVideoUrl(raw: string) {
  const parsed = assertPublicHttpUrl(raw);
  if (isSocialVideoPage(raw) || isDirectVideoUrl(raw)) return parsed;

  const ext = parsed.pathname.split(".").pop()?.toLowerCase() || "";
  if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
    throw new Error(
      "Paste an Instagram, YouTube, Facebook, or TikTok link, or a direct video file URL ending in mp4, mov, m4v, webm, mkv, or avi.",
    );
  }
  return parsed;
}

export function shouldProxyThroughDownloader(url: string) {
  return isSocialVideoPage(url) || !isDirectVideoUrl(url);
}

export function isPrivateIp(ip: string) {
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) {
    return true;
  }
  const ipv4 = ip.includes(".") ? ip.replace(/^::ffff:/, "") : "";
  return ipv4 ? isPrivateIpv4(ipv4) : false;
}

export function filenameFromVideoUrl(url: URL) {
  const name = decodeURIComponent(url.pathname.split("/").pop() || "video.mp4");
  return name.includes(".") ? name : `${name}.mp4`;
}

export function filenameFromContentDisposition(header: string, fallback: string) {
  const star = header.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].replace(/["']/g, "").trim());
    } catch {
      /* ignore malformed percent-encoding */
    }
  }
  const quoted = header.match(/filename\s*=\s*"([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const plain = header.match(/filename\s*=\s*([^;]+)/i);
  if (plain?.[1] && !plain[1].includes("*")) {
    return plain[1].trim().replace(/^["']|["']$/g, "");
  }
  return fallback;
}

export function displayVideoFilename(
  jobId: string,
  filename?: string | null,
  title?: string | null,
) {
  if (filename) {
    const stripped = filename.replace(new RegExp(`^${jobId}_`), "");
    if (stripped && !stripped.startsWith(jobId)) return stripped;
  }
  const base = (title || "video").replace(/[<>:"/\\|?*]+/g, "_").trim() || "video";
  return /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(base) ? base : `${base}.mp4`;
}

export { MAX_FILE_BYTES };
