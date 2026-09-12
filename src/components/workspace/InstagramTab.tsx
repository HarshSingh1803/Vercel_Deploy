"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { SUPPORTED_EXTENSIONS } from "@/lib/video/constants";
import { validateVideoFile } from "@/lib/video/inspect";
import { saveFileToDevice } from "@/lib/utils";
import { downloadRemoteVideo } from "@/lib/workspace/downloadRemoteVideo";
import { isSocialVideoPage } from "@/lib/workspace/parse";
import { assertRemoteVideoUrl } from "@/lib/workspace/remoteVideo";

export function InstagramTab() {
  const { addInstagramItem, instagramQueue, removeInstagramItem, addClip, defaultCaption } =
    useWorkspace();
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState("queued");
  const abortRef = useRef<AbortController | null>(null);

  async function downloadFromUrl(raw: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setMessage(null);
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Paste a link first.");
      return;
    }

    try {
      assertRemoteVideoUrl(trimmed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That link cannot be downloaded.");
      return;
    }

    setDownloading(true);
    setProgress(0);
    setStatusLabel("queued");
    try {
      const file = await downloadRemoteVideo(
        trimmed,
        (update) => {
          setProgress(update.progress);
          setStatusLabel(update.status);
        },
        controller.signal,
      );
      if (!acceptFile(file, trimmed)) return;
      saveFileToDevice(file);
      setUrl("");
      setMessage(`${file.name} saved to your Downloads folder and added to Publishing & Library.`);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Download failed.");
    } finally {
      if (abortRef.current === controller) {
        setDownloading(false);
        abortRef.current = null;
      }
    }
  }

  function acceptFile(file: File, sourceUrl?: string) {
    const validation = validateVideoFile(file);
    if (validation) {
      setError(validation);
      return false;
    }
    addClip(file, {
      caption: defaultCaption,
      sanitized: false,
      source: "instagram",
    });
    addInstagramItem({
      url: sourceUrl || file.name,
      note: sourceUrl
        ? isSocialVideoPage(sourceUrl)
          ? "Downloaded from a social video link"
          : "Downloaded from a direct video URL"
        : "Local file attached",
      fileName: file.name,
    });
    if (!sourceUrl) setMessage(`${file.name} added to Publishing & Library.`);
    return true;
  }

  const statusText =
    statusLabel === "completed"
      ? "Finishing…"
      : statusLabel === "processing"
        ? `Downloading ${Math.round(progress)}%`
        : "Queued…";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Video link download</p>
        <h2 className="mt-2 font-display text-3xl">Paste a video URL</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Instagram, YouTube, Facebook, TikTok, and public file links are fetched
          through the downloader and saved to your Downloads folder. They are also
          added to Publishing & Library. Private or login-gated posts may fail.
        </p>
        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void downloadFromUrl(url);
          }}
        >
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.instagram.com/reel/… or https://example.com/video.mp4"
            className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-accent"
          />
          <Button type="submit" disabled={downloading}>
            {downloading ? "Downloading…" : "Download"}
          </Button>
        </form>
        {downloading ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{statusText}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
              />
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-success">{message}</p> : null}
      </section>

      <section
        className={`rounded-2xl border border-dashed bg-surface p-8 text-center ${dragOver ? "border-accent bg-accent/5" : "border-border"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) acceptFile(file);
        }}
      >
        <p className="font-display text-2xl">Or drop a video file here</p>
        <p className="mt-2 text-sm text-muted">
          {SUPPORTED_EXTENSIONS.map((item) => item.toUpperCase()).join(", ")}
        </p>
        <label className="mt-5 inline-flex">
          <input
            type="file"
            className="sr-only"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm,.mkv,.avi"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) acceptFile(file);
            }}
          />
          <span className="inline-flex h-11 cursor-pointer items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
            Browse files
          </span>
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-display text-2xl">Downloads</h3>
        {instagramQueue.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No downloads yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {instagramQueue.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="break-all font-medium">{item.fileName || item.url}</p>
                  <p className="mt-1 text-muted">{item.note}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeInstagramItem(item.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
