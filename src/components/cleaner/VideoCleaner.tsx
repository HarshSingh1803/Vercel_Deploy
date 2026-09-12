"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MetadataReport } from "./MetadataReport";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { isSupabaseConfigured } from "@/lib/env";
import { formatBytes, formatDuration } from "@/lib/utils";
import { cleanVideoFile } from "@/lib/video/clean";
import {
  METADATA_CATEGORIES,
  PRIVACY_LIMITATIONS,
  SUPPORTED_EXTENSIONS,
} from "@/lib/video/constants";
import { inspectVideoFile, validateVideoFile } from "@/lib/video/inspect";
import { resetFFmpeg } from "@/lib/video/ffmpeg";
import type { MetadataCategoryId, VideoInspection } from "@/lib/video/types";
import type { CleanResult } from "@/lib/video/types";

type Stage = "upload" | "inspect" | "processing" | "result";

export function VideoCleaner({
  embedded = false,
  onAddToLibrary,
}: {
  embedded?: boolean;
  onAddToLibrary?: (file: File, sanitized: boolean) => void;
}) {
  const { user, configured } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [inspection, setInspection] = useState<VideoInspection | null>(null);
  const [selected, setSelected] = useState<MetadataCategoryId[]>(
    METADATA_CATEGORIES.map((item) => item.id),
  );
  const [stage, setStage] = useState<Stage>("upload");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CleanResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showCleaner, setShowCleaner] = useState(false);

  const availableCategories = useMemo(() => {
    const found = new Set(
      inspection?.fields.filter((field) => field.removable).map((field) => field.category),
    );
    return METADATA_CATEGORIES.filter((category) => found.has(category.id));
  }, [inspection]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const reset = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setFile(null);
    setPreviewUrl(null);
    setInspection(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("");
    setStage("upload");
    setShowCleaner(false);
    setSelected(METADATA_CATEGORIES.map((item) => item.id));
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  async function acceptFile(nextFile: File) {
    const validation = validateVideoFile(nextFile);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setResult(null);
    setShowCleaner(false);
    setFile(nextFile);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(nextFile);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setStage("inspect");
    setStatus("Reading metadata on this device…");
    try {
      const inspected = await inspectVideoFile(nextFile);
      setInspection(inspected);
      const found = METADATA_CATEGORIES.filter((category) =>
        inspected.fields.some((field) => field.category === category.id),
      ).map((category) => category.id);
      setSelected(found.length ? found : METADATA_CATEGORIES.map((item) => item.id));
      setStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not inspect this video.");
      setStage("upload");
    }
  }

  async function handleClean() {
    if (!file || !inspection) return;
    setError(null);
    setStage("processing");
    setProgress(0.04);
    setStatus("Loading the local processing engine…");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const cleaned = await cleanVideoFile(file, selected, inspection, {
        signal: controller.signal,
        onProgress: (ratio) => {
          setProgress(Math.max(0.08, ratio));
          setStatus("Stripping selected container metadata…");
        },
        onLog: () => undefined,
      });
      setResult(cleaned);
      setProgress(1);
      setStage("result");
      setStatus("Cleaning finished.");
      if (configured && user) {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await supabase.from("cleaning_history").insert({
            user_id: user.id,
            original_file_name: file.name,
            original_file_size: file.size,
            cleaned_file_size: cleaned.cleanedSize,
            file_type: inspection.fileType,
            metadata_removed: {
              categories: selected,
              labels: cleaned.removedLabels,
            },
            status: "completed",
          });
          await supabase.rpc("increment_plan_usage");
        } catch {
          // History is best-effort and must never block the download.
        }
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("Cleaning was cancelled.");
        setStage(inspection ? "inspect" : "upload");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Cleaning failed.");
      setStage("inspect");
    } finally {
      abortRef.current = null;
    }
  }

  async function handleCancel() {
    abortRef.current?.abort();
    await resetFFmpeg();
    setStage(inspection ? "inspect" : "upload");
    setStatus("");
    setProgress(0);
  }

  function downloadResult() {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toggleCategory(id: MetadataCategoryId) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <div
      className={
        embedded
          ? "space-y-6"
          : "mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6"
      }
    >
      {embedded ? null : (
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Local inspector</p>
        <h1 className="mt-2 font-display text-4xl">Video metadata</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Upload a video to inspect every tag GET-RISE can detect on this device.
          Cleaning is optional and stays in the browser.
        </p>
      </div>
      )}

      {error ? (
        <div role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {stage === "upload" || !file ? (
        <Card className={`border-dashed ${dragOver ? "border-accent bg-accent/5" : ""}`}>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const dropped = event.dataTransfer.files[0];
              if (dropped) void acceptFile(dropped);
            }}
            className="flex flex-col items-center px-4 py-10 text-center"
          >
            <p className="font-display text-2xl">Drop a video to inspect metadata</p>
            <p className="mt-2 max-w-md text-sm text-muted">
              {SUPPORTED_EXTENSIONS.map((item) => item.toUpperCase()).join(", ")} · max 350 MB
            </p>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mp4,.mov,.m4v,.webm,.mkv,.avi"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (next) void acceptFile(next);
              }}
            />
            <Button className="mt-6" onClick={() => inputRef.current?.click()}>
              Browse files
            </Button>
          </div>
        </Card>
      ) : null}

      {file && previewUrl ? (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <video
              src={previewUrl}
              controls
              className="aspect-video w-full rounded-xl bg-black"
            />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">File name</dt>
                <dd className="break-all">{file.name}</dd>
              </div>
              <div>
                <dt className="text-muted">Size</dt>
                <dd>{formatBytes(file.size)}</dd>
              </div>
              <div>
                <dt className="text-muted">Duration</dt>
                <dd>
                  {inspection?.durationSeconds
                    ? formatDuration(inspection.durationSeconds)
                    : "Reading…"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Type</dt>
                <dd>{inspection?.fileType || file.type || "Video"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                Replace file
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void reset()}>
                Remove file
              </Button>
            </div>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo,.mp4,.mov,.m4v,.webm,.mkv,.avi"
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (next) void acceptFile(next);
              }}
            />
          </Card>

          <MetadataReport
            inspection={inspection}
            loading={!inspection}
            status={status}
          />
        </div>
      ) : null}

      {inspection && stage !== "result" ? (
        showCleaner || stage === "processing" ? (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Clean metadata</h2>
                <p className="mt-1 text-sm text-muted">
                  Optional. Location cleaning uses a full container metadata wipe
                  because GPS is often stored in QuickTime atoms.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setSelected(
                      (availableCategories.length
                        ? availableCategories
                        : METADATA_CATEGORIES
                      ).map((item) => item.id),
                    )
                  }
                >
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                  Deselect all
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(availableCategories.length ? availableCategories : METADATA_CATEGORIES).map(
                (category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer gap-3 rounded-xl border border-border p-4"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium">{category.label}</span>
                      <span className="mt-1 block text-sm text-muted">
                        {category.description}
                      </span>
                    </span>
                  </label>
                ),
              )}
            </div>
            {stage === "processing" ? (
              <div className="mt-6">
                <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted" aria-live="polite">
                  {status} {Math.round(progress * 100)}%
                </p>
                <Button className="mt-4" variant="secondary" onClick={() => void handleCancel()}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => void handleClean()} disabled={selected.length === 0}>
                  Clean Metadata
                </Button>
                <Button variant="ghost" onClick={() => setShowCleaner(false)}>
                  Back to metadata
                </Button>
              </div>
            )}
            <ul className="mt-5 space-y-1 text-sm text-muted">
              {PRIVACY_LIMITATIONS.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Want to strip tags?</h2>
              <p className="mt-1 text-sm text-muted">
                Review the metadata first. Cleaning is optional and runs locally.
              </p>
            </div>
            <Button onClick={() => setShowCleaner(true)}>Clean this video</Button>
          </Card>
        )
      ) : null}

      {result && stage === "result" ? (
        <Card>
          <p className="text-sm font-medium text-success">Cleaning complete</p>
          <h2 className="mt-2 font-display text-3xl">Ready to download</h2>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <dt className="text-muted">Original size</dt>
              <dd className="mt-1 text-lg">{formatBytes(result.originalSize)}</dd>
            </div>
            <div className="rounded-xl border border-border p-4">
              <dt className="text-muted">Cleaned size</dt>
              <dd className="mt-1 text-lg">{formatBytes(result.cleanedSize)}</dd>
            </div>
          </dl>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 font-medium">Field</th>
                  <th className="py-2 font-medium">Original</th>
                  <th className="py-2 font-medium">Cleaned</th>
                </tr>
              </thead>
              <tbody>
                {result.original.fields.map((field) => {
                  const cleanedValue =
                    result.cleaned.fields.find((item) => item.label === field.label)
                      ?.value || "Removed / not present";
                  return (
                    <tr key={field.key} className="border-b border-border/70">
                      <td className="py-2">{field.label}</td>
                      <td className="py-2 break-all">{field.value}</td>
                      <td className="py-2 break-all">{cleanedValue}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {result.removedLabels.length ? (
            <p className="mt-4 text-sm text-muted">
              Removed or no longer detectable: {result.removedLabels.join(", ")}.
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No extra removable tags were detectable after inspection. A container
              wipe was still applied for the selected categories.
            </p>
          )}
          <ul className="mt-4 space-y-1 text-sm text-muted">
            {result.remainingNotes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
          {!user && isSupabaseConfigured() ? (
            <p className="mt-4 text-sm text-muted">
              Sign in to store this run in your cleaning history. The video file is
              still not uploaded.
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={downloadResult}>Download Clean Video</Button>
            {onAddToLibrary ? (
              <Button
                variant="secondary"
                onClick={() =>
                  onAddToLibrary(
                    new File([result.blob], result.fileName, { type: result.blob.type }),
                    true,
                  )
                }
              >
                Add to library
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => void reset()}>
              Inspect another video
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
