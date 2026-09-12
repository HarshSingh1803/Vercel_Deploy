import { fileExtension } from "@/lib/utils";
import {
  CATEGORY_FFMPEG_KEYS,
  METADATA_CATEGORIES,
} from "@/lib/video/constants";
import { getFFmpeg, resetFFmpeg, writeAndExec } from "@/lib/video/ffmpeg";
import { cleanedDownloadName, inspectVideoFile } from "@/lib/video/inspect";
import type { MetadataCategoryId } from "@/lib/video/types";
import type { CleanResult } from "@/lib/video/types";

function mimeForExtension(ext: string) {
  switch (ext) {
    case "webm":
      return "video/webm";
    case "mkv":
      return "video/x-matroska";
    case "mov":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    default:
      return "video/mp4";
  }
}

export function buildCleanArgs(
  inputName: string,
  outputName: string,
  selected: MetadataCategoryId[],
  ext: string,
) {
  const args = ["-hide_banner", "-i", inputName, "-map", "0", "-c", "copy"];
  const stripAll =
    selected.length === METADATA_CATEGORIES.length ||
    selected.includes("location");

  if (stripAll) {
    args.push("-map_metadata", "-1");
  } else {
    for (const category of selected) {
      for (const key of CATEGORY_FFMPEG_KEYS[category]) {
        args.push("-metadata", `${key}=`);
      }
    }
  }

  args.push("-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact");

  if (ext === "mp4" || ext === "m4v" || ext === "mov") {
    args.push("-movflags", "+faststart");
  }

  args.push(outputName);
  return { args, stripAll };
}

export async function cleanVideoFile(
  file: File,
  selected: MetadataCategoryId[],
  original: CleanResult["original"],
  handlers: {
    onLog?: (message: string) => void;
    onProgress?: (ratio: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<CleanResult> {
  if (selected.length === 0) {
    throw new Error("Select at least one metadata category to remove.");
  }

  const ext = fileExtension(file.name) || "mp4";
  const inputName = `input.${ext}`;
  const outputName = `output.${ext}`;
  const { args, stripAll } = buildCleanArgs(inputName, outputName, selected, ext);

  const ffmpeg = await getFFmpeg(handlers.onLog, handlers.onProgress);

  if (handlers.signal?.aborted) {
    throw new DOMException("Cleaning cancelled.", "AbortError");
  }

  const abort = async () => {
    await resetFFmpeg();
  };
  handlers.signal?.addEventListener("abort", abort, { once: true });

  try {
    const bytes = await writeAndExec(ffmpeg, inputName, file, args, outputName);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy], { type: mimeForExtension(ext) });
    const cleanedFile = new File([blob], cleanedDownloadName(file.name), {
      type: blob.type,
    });
    const cleaned = await inspectVideoFile(cleanedFile);
    const removed = original.fields.filter((field) => {
      if (!field.removable) return false;
      if (!selected.includes(field.category as MetadataCategoryId) && !stripAll) {
        return false;
      }
      return !cleaned.fields.some(
        (item) => item.label === field.label && item.value === field.value,
      );
    });

    return {
      blob,
      fileName: cleanedFile.name,
      originalSize: file.size,
      cleanedSize: blob.size,
      original,
      cleaned,
      removedLabels: removed.map((field) => field.label),
      remainingNotes: [
        "Playback fields such as codec, resolution, duration, and frame rate are kept on purpose.",
        stripAll
          ? "Container metadata was stripped. Location tags usually require this broader container wipe."
          : "Selected container tags were blanked. Some formats store values in ways FFmpeg cannot isolate.",
        "Bitstream encoder traces may still exist inside compressed frames.",
      ],
    };
  } finally {
    handlers.signal?.removeEventListener("abort", abort);
  }
}
