import { fileExtension } from "@/lib/utils";
import type { SubmissionRow } from "@/lib/workspace/types";

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function rowFromCells(
  cells: string[],
  headers: string[],
  index: number,
): SubmissionRow {
  const map = new Map(
    headers.map((header, headerIndex) => [header, cells[headerIndex] || ""]),
  );
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const match = [...map.entries()].find(
        ([header]) => header.toLowerCase() === key,
      );
      if (match?.[1]) return match[1];
    }
    return cells.find((cell) => cell.startsWith("http")) || cells[0] || "";
  };
  return {
    id: `sub-${index}-${Date.now()}`,
    title: pick("title", "name", "clip", "filename") || `Row ${index + 1}`,
    url: pick("url", "link", "video", "instagram", "reel"),
    caption: pick("caption", "description", "text"),
    notes: pick("notes", "comment", "status"),
  };
}

export function parseCsv(text: string): SubmissionRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map((item) => item.toLowerCase());
  const body = headers.some((header) =>
    ["title", "url", "link", "caption", "name"].includes(header),
  )
    ? lines.slice(1)
    : lines;
  const resolvedHeaders = body === lines ? ["title", "url", "caption"] : headers;
  return body.map((line, index) =>
    rowFromCells(splitCsvLine(line), resolvedHeaders, index),
  );
}

export async function parseSpreadsheet(file: File): Promise<SubmissionRow[]> {
  const ext = fileExtension(file.name);
  if (ext === "csv" || ext === "txt") {
    return parseCsv(await file.text());
  }
  if (ext === "tsv") {
    const text = await file.text();
    const asCsv = text
      .split(/\r?\n/)
      .map((line) =>
        line
          .split("\t")
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    return parseCsv(asCsv);
  }

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx/xlsx.mjs");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return parseCsv(csv);
  }

  if (ext === "pdf") {
    const buffer = await file.arrayBuffer();
    const raw = new TextDecoder("latin1").decode(buffer);
    const urls = [
      ...new Set(
        [...raw.matchAll(/https?:\/\/[^\s\\)]+/g)].map((match) =>
          match[0].replace(/[),.;]+$/, ""),
        ),
      ),
    ].filter((url) => url.length < 300);
    if (urls.length === 0) {
      throw new Error(
        "No links were found in that PDF. Export a CSV/XLSX with url, title, and caption columns.",
      );
    }
    return urls.map((url, index) => ({
      id: `pdf-${index}-${Date.now()}`,
      title: `PDF link ${index + 1}`,
      url,
      caption: "",
      notes: file.name,
    }));
  }

  throw new Error("Use CSV, XLSX, TSV, or PDF.");
}

export function isSocialVideoPage(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      host.includes("instagram.com") ||
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("facebook.com") ||
      host.includes("fb.watch") ||
      host.includes("tiktok.com")
    );
  } catch {
    return false;
  }
}

export function isDirectVideoUrl(url: string) {
  try {
    const parsed = new URL(url);
    return /\.(mp4|mov|m4v|webm|mkv|avi)(\?|$)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}
