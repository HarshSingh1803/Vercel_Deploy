import type {
  AudioTrack,
  Extra,
  GeneralTrack,
  Track,
  VideoTrack,
} from "mediainfo.js";

import {
  fileExtension,
  formatBytes,
  formatDuration,
  stemName,
} from "@/lib/utils";

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

function asText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return null;
}

function humanize(key: string): string {
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
  if (category === "location") {
    return "Location";
  }

  if (category === "timestamps") {
    return "Dates";
  }

  if (category === "device") {
    return "Device";
  }

  if (category === "descriptive") {
    return "Tags";
  }

  if (trackType === "Video") {
    return "Video";
  }

  if (trackType === "Audio") {
    return "Audio";
  }

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

  if (!text) {
    return;
  }

  if (text.length > 400) {
    return;
  }

  fields.push({
    key,
    label,
    value: text,
    category,
    removable: category !== "technical",
    group,
  });
}

function extraValue(extra: Extra | undefined, names: string[]): string | null {
  if (!extra) {
    return null;
  }

  const record = extra as unknown as Record<string, unknown>;

  for (const name of names) {
    const match = Object.entries(record).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    );

    if (match) {
      return asText(match[1]);
    }
  }

  return null;
}

function looksLikeLocation(key: string, value: string): boolean {
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
    if (SKIP_KEYS.has(key) || key.startsWith("@")) {
      continue;
    }

    if (/_String\d+$/.test(key)) {
      continue;
    }

    if (key.endsWith("_String")) {
      continue;
    }

    const display = asText(record[`${key}_String`]) ?? asText(value);

    if (!display) {
      continue;
    }

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

  if (!extra) {
    return;
  }

  const extraRecord = extra as unknown as Record<string, unknown>;

  for (const [key, value] of Object.entries(extraRecord)) {
    const text = asText(value);

    if (!text) {
      continue;
    }

    const category: MetadataCategoryId | "technical" = looksLikeLocation(
      key,
      text,
    )
      ? "location"
      : categorize(key);

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

export function validateVideoFile(file: File): string | null {
  const ext = fileExtension(file.name);

  const mimeOk =
    !file.type ||
    file.type.startsWith("video/") ||
    SUPPORTED_MIME_TYPES.includes(file.type);

  const extOk = SUPPORTED_EXTENSIONS.includes(
    ext as (typeof SUPPORTED_EXTENSIONS)[number],
  );

  if (!extOk || !mimeOk) {
    return `Use a supported video format: ${SUPPORTED_EXTENSIONS.map((item) =>
      item.toUpperCase(),
    ).join(", ")}.`;
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

  const elementMeta = await readElementMetadata(file).catch(() => ({
    durationSeconds: null,
    width: null,
    height: null,
  }));

  if (typeof window === "undefined") {
    throw new Error("Video inspection is only available in the browser.");
  }

  /*
   * IMPORTANT:
   * MediaInfo is loaded only in the browser.
   * This prevents Next.js server/build side from trying
   * to resolve the WASM file.
   */
  const { default: mediaInfoFactory } = await import("mediainfo.js");

  const mediaInfo = await mediaInfoFactory({
    format: "object",
    coverData: false,
    full: true,

    locateFile: (path: string, prefix: string) => {
      if (path.endsWith(".wasm")) {
        return "/wasm/MediaInfoModule.wasm";
      }

      return prefix + path;
    },
  });

  try {
    const result = await mediaInfo.analyzeData(
      () => file.size,

      async (chunkSize: number, offset: number) =>
        new Uint8Array(
          await file.slice(offset, offset + chunkSize).arrayBuffer(),
        ),
    );

    /*
     * IMPORTANT:
     * Double cast through unknown fixes:
     *
     * Conversion of type 'Track[]' to type
     * 'Record<string, unknown>[]'
     *
     * error.
     */
    const tracks = (result.media?.track ?? []) as unknown as Track[];

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

    const durationValue = general?.Duration;

    const durationSeconds =
      (typeof durationValue === "number" ? durationValue : null) ??
      elementMeta.durationSeconds;

    const width =
      (typeof video?.Width === "number" ? video.Width : null) ??
      elementMeta.width;

    const height =
      (typeof video?.Height === "number" ? video.Height : null) ??
      elementMeta.height;

    const fileType =
      asText(general?.Format) ||
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
      file.lastModified ? new Date(file.lastModified).toISOString() : null,
      "technical",
      "Dates",
    );

    /*
     * Process every MediaInfo track.
     */
    tracks.forEach((track, index) => {
      const trackType = String(track["@type"] ?? "Unknown");

      harvestTrack(fields, track, trackType, index);
    });

    /*
     * GPS / Location metadata.
     */
    const extra = general?.extra as Extra | undefined;

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

    /*
     * Remove duplicate metadata fields.
     */
    const unique = fields.filter(
      (field, index, list) =>
        list.findIndex(
          (item) => item.label === field.label && item.value === field.value,
        ) === index,
    );

    return {
      fileName: file.name,

      fileType,

      fileSize: file.size,

      durationSeconds,

      width: width ?? null,

      height: height ?? null,

      frameRate:
        asText(video?.FrameRate_String) ??
        (typeof video?.FrameRate === "number"
          ? `${video.FrameRate} fps`
          : null),

      videoCodec: asText(video?.Format) ?? asText(video?.CodecID) ?? null,

      audioCodec: asText(audio?.Format) ?? asText(audio?.CodecID) ?? null,

      fields: unique,
    };
  } finally {
    mediaInfo.close();
  }
}

export function cleanedDownloadName(originalName: string) {
  return `${stemName(originalName)}-cleaned.${
    fileExtension(originalName) || "mp4"
  }`;
}
