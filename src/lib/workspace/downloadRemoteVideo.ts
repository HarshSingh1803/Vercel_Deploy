export type RemoteDownloadProgress = {
  status: string;
  progress: number;
  title?: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error || `Download failed (${response.status}).`;
}

function filenameFromHeader(response: Response, fallback: string) {
  const header = response.headers.get("X-File-Name");
  if (!header) return fallback;
  try {
    return decodeURIComponent(header);
  } catch {
    return header;
  }
}

function fileFromResponse(response: Response, blob: Blob, fallbackName: string) {
  const name = filenameFromHeader(response, fallbackName) || "video.mp4";
  return new File([blob], name, { type: blob.type || "video/mp4" });
}

async function waitForJobFile(
  jobId: string,
  onProgress?: (progress: RemoteDownloadProgress) => void,
  signal?: AbortSignal,
) {
  let fallbackName = "video.mp4";

  while (true) {
    if (signal?.aborted) throw new DOMException("Download cancelled.", "AbortError");

    const response = await fetch(`/api/fetch-video/status/${jobId}`, { signal });
    if (!response.ok) throw new Error(await readError(response));

    const job = (await response.json()) as {
      status?: string;
      progress?: number;
      title?: string | null;
      filename?: string | null;
      downloadName?: string | null;
      error?: string | null;
    };
    const status = job.status || "queued";
    const progress = Number(job.progress || 0);
    onProgress?.({ status, progress, title: job.title });

    if (job.downloadName) fallbackName = job.downloadName;
    else if (job.title) fallbackName = `${job.title}.mp4`;
    else if (job.filename) fallbackName = job.filename;

    if (status === "completed") break;
    if (status === "failed") {
      throw new Error(job.error || "Unable to download the requested video.");
    }
    await sleep(1000);
  }

  const fileResponse = await fetch(`/api/fetch-video/file/${jobId}`, { signal });
  if (!fileResponse.ok) throw new Error(await readError(fileResponse));
  const blob = await fileResponse.blob();
  return fileFromResponse(fileResponse, blob, fallbackName);
}

export async function downloadRemoteVideo(
  url: string,
  onProgress?: (progress: RemoteDownloadProgress) => void,
  signal?: AbortSignal,
) {
  const response = await fetch("/api/fetch-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal,
  });

  if (!response.ok) throw new Error(await readError(response));

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { jobId?: string; error?: string };
    if (!payload.jobId) {
      throw new Error(payload.error || "Download did not start.");
    }
    onProgress?.({ status: "queued", progress: 0 });
    return waitForJobFile(payload.jobId, onProgress, signal);
  }

  const blob = await response.blob();
  const name =
    filenameFromHeader(response, "") ||
    decodeURIComponent(new URL(url).pathname.split("/").pop() || "video.mp4");
  onProgress?.({ status: "completed", progress: 100 });
  return fileFromResponse(response, blob, name);
}
