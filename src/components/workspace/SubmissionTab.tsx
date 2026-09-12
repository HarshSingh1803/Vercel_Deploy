"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { downloadRemoteVideo } from "@/lib/workspace/downloadRemoteVideo";
import { parseSpreadsheet } from "@/lib/workspace/parse";
import { assertRemoteVideoUrl } from "@/lib/workspace/remoteVideo";
import { saveFileToDevice } from "@/lib/utils";
import type { SubmissionRow } from "@/lib/workspace/types";

export function SubmissionTab() {
  const { submissions, setSubmissions, attachSubmissionFile } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function accept(file: File) {
    setError(null);
    setStatus(`Reading ${file.name}…`);
    try {
      const rows = await parseSpreadsheet(file);
      setSubmissions(rows);
      setStatus(`${rows.length} rows imported from ${file.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import that file.");
      setStatus(null);
    }
  }

  async function downloadRow(row: SubmissionRow) {
    setError(null);
    if (!row.url) {
      setError("That row has no video URL.");
      return;
    }
    try {
      assertRemoteVideoUrl(row.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That link cannot be downloaded.");
      return;
    }
    setBusyId(row.id);
    setStatus(`Downloading ${row.title}…`);
    try {
      const file = await downloadRemoteVideo(row.url, (update) => {
        setStatus(
          `${row.title}: ${update.status === "processing" ? `${Math.round(update.progress)}%` : update.status}`,
        );
      });
      attachSubmissionFile(row.id, file);
      saveFileToDevice(file);
      setStatus(`${file.name} saved to your Downloads folder and attached to ${row.title}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Download failed.");
      setStatus(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Submission import</p>
          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-medium text-violet-300">
            PDF & SHEETS
          </span>
        </div>
        <h2 className="mt-2 font-display text-3xl">Import a sheet or PDF</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Drop a CSV, XLSX, TSV, or PDF. GET-RISE reads titles, captions, and links
          from columns such as <span className="font-mono">url</span>,{" "}
          <span className="font-mono">title</span>, and{" "}
          <span className="font-mono">caption</span>. Social links can be downloaded
          into the row, or attach a local video file yourself.
        </p>
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
          const file = event.dataTransfer.files[0];
          if (file) void accept(file);
        }}
      >
        <p className="font-display text-2xl">Click or drop CSV, XLSX, or PDF</p>
        <p className="mt-2 text-sm text-muted">Columns: url, title, caption, notes</p>
        <Button className="mt-5" onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void accept(file);
          }}
        />
        {status ? <p className="mt-4 text-sm text-success">{status}</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-border bg-surface p-6">
        <h3 className="font-display text-2xl">Imported rows</h3>
        {submissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing imported yet.</p>
        ) : (
          <table className="mt-4 w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 font-medium">Title</th>
                <th className="py-2 font-medium">URL / link</th>
                <th className="py-2 font-medium">Caption</th>
                <th className="py-2 font-medium">Video</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  <td className="py-3 pr-3">{row.title}</td>
                  <td className="max-w-[16rem] break-all py-3 pr-3">{row.url || "—"}</td>
                  <td className="max-w-[14rem] py-3 pr-3">{row.caption || "—"}</td>
                  <td className="py-3">
                    <div className="flex flex-col gap-2">
                      {row.url ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busyId === row.id}
                          onClick={() => void downloadRow(row)}
                        >
                          {busyId === row.id ? "Downloading…" : "Download"}
                        </Button>
                      ) : null}
                      <label className="cursor-pointer text-accent">
                        {row.fileName ? row.fileName : "Attach file"}
                        <input
                          type="file"
                          className="sr-only"
                          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm,.mkv,.avi"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) attachSubmissionFile(row.id, file);
                          }}
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
