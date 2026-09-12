import { NextResponse } from "next/server";
import {
  displayVideoFilename,
  filenameFromContentDisposition,
} from "@/lib/workspace/remoteVideo";
import { getDownloaderFile, getDownloaderJob } from "@/lib/workspace/videoDownloader";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const [upstream, job] = await Promise.all([
      getDownloaderFile(jobId),
      getDownloaderJob(jobId).catch(() => null),
    ]);
    const contentType = upstream.headers.get("content-type") || "video/mp4";
    const disposition = upstream.headers.get("content-disposition") || "";
    const headerName = filenameFromContentDisposition(disposition, "");
    const filename =
      job?.downloadName ||
      headerName ||
      displayVideoFilename(jobId, job?.filename, job?.title);

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "X-File-Name": encodeURIComponent(filename),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "File not found." },
      { status: 404 },
    );
  }
}
