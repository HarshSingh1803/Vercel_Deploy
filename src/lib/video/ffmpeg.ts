import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export async function getFFmpeg(
  onLog?: (message: string) => void,
  onProgress?: (ratio: number) => void,
) {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }

  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }
  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.max(0, Math.min(1, progress)));
    });
  }

  if (ffmpeg.loaded) return ffmpeg;

  if (!loading) {
    loading = (async () => {
      await ffmpeg!.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(
          `${CORE_BASE}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });
      return ffmpeg!;
    })();
  }

  return loading;
}

export async function resetFFmpeg() {
  if (ffmpeg) {
    try {
      ffmpeg.terminate();
    } catch {
      // Ignore terminate errors from an already stopped instance.
    }
  }
  ffmpeg = null;
  loading = null;
}

export async function writeAndExec(
  instance: FFmpeg,
  inputName: string,
  file: File,
  args: string[],
  outputName: string,
) {
  await instance.writeFile(inputName, await fetchFile(file));
  const code = await instance.exec(args, 600000);
  if (code !== 0) {
    throw new Error("Metadata cleaning failed for this file.");
  }
  const data = await instance.readFile(outputName);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  try {
    await instance.deleteFile(inputName);
    await instance.deleteFile(outputName);
  } catch {
    // Temporary files may already be gone.
  }
  return bytes;
}
