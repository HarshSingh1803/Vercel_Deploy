import type { AudioTrack, Extra, GeneralTrack, Track, VideoTrack } from "mediainfo.js";
import { fileExtension, formatBytes, formatDuration, stemName } from "@/lib/utils";
import {
  MAX_FILE_BYTES,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
} from "@/lib/video/constants";
import type {
  MetadataCategoryId,
  MetadataField,
  MetadataGroup,
  VideoInspection,
} from "@/lib/video/types";

const SKIP_KEYS = new Set([
  "@type",
  "@typeorder",
  "extra",
  "Count",
  "Status",
  "StreamOrder",
  "ID",
  "UniqueID",
  "Cover_Data",
  "Encoded_Library_Settings",
]);

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

function humanize(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function categorize(key: string): MetadataCategoryId | "technical" {
  const k = key.toLowerCase();
  if (
    /gps|location|latitude|longitude|iso6709|recorded_location|\bxyz\b/.test(k)
  ) {
    return "location";
  }
  if (
    /(encoded_date|tagged_date|recorded_date|creation|created|modified|timestamp)/.test(
      k,
    ) ||
    (/date|time/.test(k) &&
      !/timecode|frame.?rate|duration|bitrate|time_code|delay/.test(k))
  ) {
    return "timestamps";
  }
  if (
    /make|model|encoder|encoded_application|encoded_library|writing_library|software|device|camera/.test(
      k,
    )
  ) {
    return "device";
  }
  if (
    /title|comment|description|copyright|performer|artist|album|genre|composer|synopsis|actor|director|show|season|lyrics/.test(
      k,
    )
  ) {
    return "descriptive";
  }
  return "technical";
}

function groupFor(
  trackType: string,
  category: MetadataCategoryId | "technical",
): MetadataGroup {
  if (category === "location") return "Location";
  if (category === "timestamps") return "Dates";
  if (category === "device") return "Device";
  if (category === "descriptive") return "Tags";
  if (trackType === "Video") return "Video";
  if (trackType === "Audio") return "Audio";
  return "File";
}

function pushField(
  fields: MetadataField[],
  key: string,
  label: string,
  value: unknown,
  category: MetadataCategoryId | "technical",
  group: MetadataGroup,
) {
  const text = asText(value);
  if (!text) return;
  if (text.length > 400) return;
  fields.push({
    key,
    label,
    value: text,
    category,
    removable: category !== "technical",
    group,
  });
}

function extraValue(extra: Extra | undefined, names: string[]) {
  if (!extra) return null;
  for (const name of names) {
    const match = Object.entries(extra).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    );
    if (match) return asText(match[1]);
  }
  return null;
}

function looksLikeLocation(key: string, value: string) {
  const haystack = `${key} ${value}`.toLowerCase();
  return (
    haystack.includes("gps") ||
    haystack.includes("location") ||
    haystack.includes("iso6709") ||
    haystack.includes("latitude") ||
    haystack.includes("longitude") ||
    /[+-]\d+\.\d+[+-]\d+\.\d+/.test(value)
  );
}

function harvestTrack(
  fields: MetadataField[],
  track: Track,
  trackType: string,
  index: number,
) {
  const record = track as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (SKIP_KEYS.has(key) || key.startsWith("@")) continue;
    if (/_String\d+$/.test(key)) continue;
    if (key.endsWith("_String")) continue;

    const display = asText(record[`${key}_String`]) ?? asText(value);
    if (!display) continue;

    const category = categorize(key);
    pushField(
      fields,
      `${trackType}-${index}-${key}`,
      humanize(key),
      display,
      category,
      groupFor(trackType, category),
    );
  }

  const extra = record.extra as Extra | undefined;
  if (!extra) return;
  for (const [key, value] of Object.entries(extra)) {
    const text = asText(value);
    if (!text) continue;
    let category: MetadataCategoryId | "technical" = "descriptive";
    if (looksLikeLocation(key, text)) category = "location";
    else category = categorize(key);
    pushField(
      fields,
      `${trackType}-${index}-extra-${key}`,
      key,
      text,
      category,
      groupFor(trackType, category),
    );
  }
}

export function validateVideoFile(file: File) {
  const ext = fileExtension(file.name);
  const mimeOk =
    !file.type ||
    file.type.startsWith("video/") ||
    SUPPORTED_MIME_TYPES.includes(file.type);
  const extOk = SUPPORTED_EXTENSIONS.includes(
    ext as (typeof SUPPORTED_EXTENSIONS)[number],
  );

  if (!extOk || !mimeOk) {
    return `Use a supported video format: ${SUPPORTED_EXTENSIONS.map((item) => item.toUpperCase()).join(", ")}.`;
  }
  if (file.size <= 0) {
    return "That file is empty.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "Files larger than 350 MB cannot be processed in the browser.";
  }
  return null;
}

export async function readElementMetadata(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        resolve();
      }, 4000);
      video.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("This file could not be read as a video."));
      };
    });
    return {
      durationSeconds:
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : null,
      width: video.videoWidth || null,
      height: video.videoHeight || null,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function inspectVideoFile(file: File): Promise<VideoInspection> {
  const validationError = validateVideoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const [{ default: mediaInfoFactory }, elementMeta] = await Promise.all([
    import("mediainfo.js"),
    readElementMetadata(file).catch(() => ({
      durationSeconds: null,
      width: null,
      height: null,
    })),
  ]);

  const mediaInfo = await mediaInfoFactory({
    format: "object",
    coverData: false,
    full: true,
    locateFile: (path, prefix) => {
      if (path.endsWith(".wasm")) return "/wasm/MediaInfoModule.wasm";
      return prefix + path;
    },
  });

  try {
    const result = await mediaInfo.analyzeData(
      () => file.size,
      async (chunkSize, offset) =>
        new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer()),
    );

    const tracks = result.media?.track ?? [];
    const general = tracks.find((track) => track["@type"] === "General") as
      | GeneralTrack
      | undefined;
    const video = tracks.find((track) => track["@type"] === "Video") as
      | VideoTrack
      | undefined;
    const audio = tracks.find((track) => track["@type"] === "Audio") as
      | AudioTrack
      | undefined;

    const fields: MetadataField[] = [];
    const durationSeconds =
      (typeof general?.Duration === "number" ? general.Duration : null) ??
      elementMeta.durationSeconds;
    const width = video?.Width ?? elementMeta.width;
    const height = video?.Height ?? elementMeta.height;
    const fileType =
      general?.Format ||
      file.type ||
      fileExtension(file.name).toUpperCase() ||
      "Video";

    pushField(fields, "fileName", "File name", file.name, "technical", "File");
    pushField(fields, "fileType", "File type", fileType, "technical", "File");
    pushField(
      fields,
      "mimeType",
      "MIME type",
      file.type || null,
      "technical",
      "File",
    );
    pushField(
      fields,
      "fileSize",
      "File size",
      formatBytes(file.size),
      "technical",
      "File",
    );
    pushField(
      fields,
      "fileSizeBytes",
      "File size (bytes)",
      String(file.size),
      "technical",
      "File",
    );
    pushField(
      fields,
      "duration",
      "Duration",
      durationSeconds
        ? `${formatDuration(durationSeconds)} (${durationSeconds.toFixed(2)} s)`
        : null,
      "technical",
      "File",
    );
    pushField(
      fields,
      "resolution",
      "Resolution",
      width && height ? `${width} × ${height}` : null,
      "technical",
      "Video",
    );
    pushField(
      fields,
      "browserModified",
      "Last modified on this device",
      file.lastModified
        ? new Date(file.lastModified).toISOString()
        : null,
      "technical",
      "Dates",
    );

    tracks.forEach((track, index) => {
      harvestTrack(fields, track, track["@type"], index);
    });

    const extra = general?.extra;
    const gps =
      extraValue(extra, [
        "xyz",
        "com.apple.quicktime.location.ISO6709",
        "com.apple.quicktime.location.name",
        "location",
        "GPSCoordinates",
        "©xyz",
      ]) || asText(general?.Recorded_Location);
    pushField(fields, "gps", "GPS / location", gps, "location", "Location");

    const unique = fields.filter((field, index, list) => {
      if (
        list.findIndex(
          (item) => item.label === field.label && item.value === field.value,
        ) !== index
      ) {
        return false;
      }
      return true;
    });

    return {
      fileName: file.name,
      fileType,
      fileSize: file.size,
      durationSeconds,
      width: width ?? null,
      height: height ?? null,
      frameRate:
        video?.FrameRate_String ??
        (video?.FrameRate ? `${video.FrameRate} fps` : null),
      videoCodec: video?.Format ?? video?.CodecID ?? null,
      audioCodec: audio?.Format ?? audio?.CodecID ?? null,
      fields: unique,
    };
  } finally {
    mediaInfo.close();
  }
}

export function cleanedDownloadName(originalName: string) {
  return `${stemName(originalName)}-cleaned.${fileExtension(originalName) || "mp4"}`;
}
