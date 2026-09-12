import { NextResponse } from "next/server";
import { getDownloaderJob } from "@/lib/workspace/videoDownloader";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const job = await getDownloaderJob(jobId);
    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      title: job.title,
      filename: job.filename,
      downloadName: job.downloadName,
      downloadUrl: job.downloadUrl,
      error: job.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Job not found." },
      { status: 404 },
    );
  }
}
