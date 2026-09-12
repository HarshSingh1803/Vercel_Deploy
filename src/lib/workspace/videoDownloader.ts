import { getVideoDownloaderUrl } from "@/lib/env";

const JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DownloaderJob = {
  success?: boolean;
  jobId: string;
  status: string;
  progress: number;
  title: string | null;
  filename: string | null;
  downloadName: string | null;
  downloadUrl: string | null;
  error: string | null;
};

function downloaderBase() {
  return getVideoDownloaderUrl().replace(/\/$/, "");
}

export function assertJobId(jobId: string) {
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new Error("Invalid download job.");
  }
  return jobId;
}

async function readDownloaderError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { detail?: string; error?: string }
    | null;
  return payload?.detail || payload?.error || `Downloader returned ${response.status}.`;
}

export async function downloaderFetch(path: string, init?: RequestInit) {
  try {
    return await fetch(`${downloaderBase()}${path}`, {
      ...init,
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Video downloader is not running. Start the Python server on port 8000.",
    );
  }
}

function mapJob(payload: Record<string, unknown>, fallbackId = ""): DownloaderJob {
  return {
    success: Boolean(payload.success),
    jobId: String(payload.job_id || payload.jobId || fallbackId),
    status: String(payload.status || "queued"),
    progress: Number(payload.progress || 0),
    title: typeof payload.title === "string" ? payload.title : null,
    filename: typeof payload.filename === "string" ? payload.filename : null,
    downloadName:
      typeof payload.download_name === "string"
        ? payload.download_name
        : typeof payload.downloadName === "string"
          ? payload.downloadName
          : null,
    downloadUrl:
      typeof payload.download_url === "string"
        ? payload.download_url
        : typeof payload.downloadUrl === "string"
          ? payload.downloadUrl
          : null,
    error: typeof payload.error === "string" ? payload.error : null,
  };
}

export async function startDownloaderJob(url: string) {
  const response = await downloaderFetch("/api/v1/video/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    throw new Error(
      (payload?.detail as string) ||
        (payload?.error as string) ||
        "Could not start the video download.",
    );
  }
  const job = mapJob(payload);
  if (!job.jobId) throw new Error("Downloader did not return a job id.");
  return job;
}

export async function getDownloaderJob(jobId: string) {
  const safeId = assertJobId(jobId);
  const response = await downloaderFetch(`/api/v1/video/status/${safeId}`);
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    throw new Error(
      (payload?.detail as string) ||
        (payload?.error as string) ||
        "Job not found.",
    );
  }
  return mapJob(payload, safeId);
}

export async function getDownloaderFile(jobId: string) {
  const safeId = assertJobId(jobId);
  const response = await downloaderFetch(`/api/v1/video/file/${safeId}`);
  if (!response.ok || !response.body) {
    throw new Error(await readDownloaderError(response));
  }
  return response;
}
