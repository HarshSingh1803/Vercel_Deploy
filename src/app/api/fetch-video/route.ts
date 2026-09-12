import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import {
  MAX_FILE_BYTES,
  assertRemoteVideoUrl,
  filenameFromVideoUrl,
  isPrivateIp,
  shouldProxyThroughDownloader,
} from "@/lib/workspace/remoteVideo";
import { startDownloaderJob } from "@/lib/workspace/videoDownloader";

export const runtime = "nodejs";
export const maxDuration = 60;

async function assertPublicHost(hostname: string) {
  const { address } = await lookup(hostname);
  if (isPrivateIp(address)) {
    throw new Error("That host is not allowed.");
  }
}

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const parsed = assertRemoteVideoUrl(body.url || "");
    await assertPublicHost(parsed.hostname);

    if (shouldProxyThroughDownloader(parsed.toString())) {
      const job = await startDownloaderJob(parsed.toString());
      return NextResponse.json({
        success: true,
        jobId: job.jobId,
        status: job.status,
      });
    }

    const upstream = await fetch(parsed.toString(), {
      redirect: "manual",
      headers: { Accept: "video/*,*/*;q=0.8" },
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      if (!location) throw new Error("The video host returned a broken redirect.");
      const redirected = assertRemoteVideoUrl(new URL(location, parsed).toString());
      await assertPublicHost(redirected.hostname);
      const second = await fetch(redirected.toString(), {
        redirect: "error",
        headers: { Accept: "video/*,*/*;q=0.8" },
      });
      return streamVideo(second, filenameFromVideoUrl(redirected));
    }

    return streamVideo(upstream, filenameFromVideoUrl(parsed));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed." },
      { status: 400 },
    );
  }
}

function streamVideo(upstream: Response, filename: string) {
  if (!upstream.ok || !upstream.body) {
    throw new Error("The video could not be downloaded from that link.");
  }
  const contentType = upstream.headers.get("content-type") || "";
  if (contentType && !contentType.startsWith("video/") && !contentType.includes("octet-stream")) {
    throw new Error("That link did not return a video file.");
  }
  const length = Number(upstream.headers.get("content-length") || "0");
  if (length > MAX_FILE_BYTES) {
    throw new Error("That file is larger than 350 MB.");
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType.startsWith("video/") ? contentType : "video/mp4",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "X-File-Name": filename,
    },
  });
}
