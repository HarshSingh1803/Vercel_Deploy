"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { formatBytes, saveFileToDevice } from "@/lib/utils";
import { METADATA_CATEGORIES } from "@/lib/video/constants";
import { cleanVideoFile } from "@/lib/video/clean";
import { inspectVideoFile, validateVideoFile } from "@/lib/video/inspect";

export function PublishingTab() {
  const { defaultCaption, setDefaultCaption, clips, addClip, removeClip } =
    useWorkspace();
  const [captionDraft, setCaptionDraft] = useState<string | null>(null);
  const [captionStatus, setCaptionStatus] = useState<string | null>(null);
  const caption = captionDraft ?? defaultCaption;
  const [connectOpen, setConnectOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;

  function saveCaption() {
    setDefaultCaption(caption);
    setCaptionStatus("Default caption saved on this device.");
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCaptionStatus("Caption copied.");
  }

  async function acceptFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    setError(null);
    setBusy(true);
    try {
      for (const file of files) {
        const validation = validateVideoFile(file);
        if (validation) throw new Error(validation);
        setStatus(`Sanitizing ${file.name} locally…`);
        const inspection = await inspectVideoFile(file);
        const cleaned = await cleanVideoFile(
          file,
          METADATA_CATEGORIES.map((item) => item.id),
          inspection,
        );
        const sanitized = new File([cleaned.blob], cleaned.fileName, {
          type: cleaned.blob.type,
        });
        addClip(sanitized, {
          caption,
          sanitized: true,
          source: "upload",
        });
      }
      setStatus("Clips added to the local content library.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that video.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              Instagram publishing hub
            </p>
            <h2 className="mt-2 font-display text-3xl">Connected Instagram accounts</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Reels can be published to your own Meta Instagram creator or business
              account through official Login. GET-RISE never asks for your Instagram
              password in this app.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-[linear-gradient(90deg,#e85d8c,#f2a24a)] text-white shadow-none hover:brightness-110"
              onClick={() => setConnectOpen(true)}
            >
              + Connect Instagram Account
            </Button>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full border border-border"
              aria-label="Refresh accounts"
              onClick={() => setConnectOpen(true)}
            >
              ↻
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          No Instagram accounts connected yet. Click{" "}
          <strong>Connect Instagram Account</strong> to authenticate with official
          Meta Login.
        </div>
      </section>

      {connectOpen ? (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-display text-2xl">Official Meta Login</h3>
          {metaAppId ? (
            <p className="mt-2 text-sm text-muted">
              Meta App ID is present. Finish the Facebook Login product, Instagram
              Graph permissions, and OAuth redirect in your Meta app, then reconnect.
            </p>
          ) : (
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
              <li>Create a Meta app with Instagram product + Facebook Login.</li>
              <li>
                Add <span className="font-mono">NEXT_PUBLIC_META_APP_ID</span> to
                `.env.local`. Keep the app secret on the server only.
              </li>
              <li>
                Use a professional Instagram account. Personal scraping logins are
                not supported.
              </li>
            </ol>
          )}
          <Button className="mt-4" variant="secondary" onClick={() => setConnectOpen(false)}>
            Close
          </Button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Default caption</p>
            <p className="mt-1 text-sm text-muted">
              Automatically used for newly imported or sanitized clips.
            </p>
          </div>
        </div>
        <textarea
          value={caption}
          onChange={(event) => {
            setCaptionDraft(event.target.value);
            setCaptionStatus(null);
          }}
          rows={5}
          placeholder="Enter your default caption and hashtags (e.g., Rise with GET-RISE)…"
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => void copyCaption()}>
            Copy caption
          </Button>
          <Button
            className="bg-violet-500 text-white shadow-none hover:bg-violet-400"
            onClick={saveCaption}
          >
            Save default caption
          </Button>
        </div>
        {captionStatus ? <p className="mt-2 text-sm text-success">{captionStatus}</p> : null}
      </section>

      <section
        className={`rounded-2xl border border-dashed bg-surface p-10 text-center ${dragOver ? "border-accent bg-accent/5" : "border-border"}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (event.dataTransfer.files.length) void acceptFiles(event.dataTransfer.files);
        }}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-muted">
          Add videos to content library
        </p>
        <p className="mt-2 text-sm text-muted">Automatic local metadata sanitization</p>
        <div className="mx-auto mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/20 text-2xl text-violet-300">
          ↑
        </div>
        <p className="mt-4 font-display text-2xl">Click or drag & drop videos here</p>
        <p className="mt-2 text-sm text-muted">
          Videos are stripped of GPS, device IDs, and tracking metadata before they
          enter the library. Files stay on this device.
        </p>
        <Button className="mt-5" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Sanitizing…" : "Select videos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm,.mkv,.avi"
          onChange={(event) => {
            if (event.target.files?.length) void acceptFiles(event.target.files);
          }}
        />
        {status ? <p className="mt-3 text-sm text-success">{status}</p> : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-display text-2xl">Library</h3>
        {clips.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No clips in the local library yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {clips.map((clip) => (
              <li key={clip.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{clip.name}</p>
                  <p className="text-muted">
                    {formatBytes(clip.size)} · {clip.sanitized ? "sanitized" : "original"} ·{" "}
                    {clip.source}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => saveFileToDevice(clip.file)}>
                    Save locally
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeClip(clip.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
