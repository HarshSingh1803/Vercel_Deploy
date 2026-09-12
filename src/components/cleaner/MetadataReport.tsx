"use client";

import { useMemo, useState } from "react";
import { formatBytes, formatDuration } from "@/lib/utils";
import type { MetadataGroup, VideoInspection } from "@/lib/video/types";

const GROUP_ORDER: MetadataGroup[] = [
  "File",
  "Video",
  "Audio",
  "Dates",
  "Device",
  "Location",
  "Tags",
];

export function MetadataReport({
  inspection,
  loading,
  status,
}: {
  inspection: VideoInspection | null;
  loading: boolean;
  status: string;
}) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const fields = (inspection?.fields ?? []).filter((field) => {
      if (!query.trim()) return true;
      const haystack = `${field.label} ${field.value}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
    return GROUP_ORDER.map((group) => ({
      group,
      fields: fields.filter((field) => field.group === group),
    })).filter((item) => item.fields.length > 0);
  }, [inspection, query]);

  if (loading || !inspection) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-display text-2xl">Metadata</h2>
        <p className="mt-3 text-sm text-muted">{status || "Reading metadata on this device…"}</p>
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-foreground/8" />
      </div>
    );
  }

  const removableCount = inspection.fields.filter((field) => field.removable).length;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Inspected locally</p>
          <h2 className="mt-1 font-display text-2xl">Video metadata</h2>
          <p className="mt-1 text-sm text-muted">
            {inspection.fields.length} fields found
            {removableCount
              ? ` · ${removableCount} can be stripped`
              : " · no extra GPS, title, or device tags detected"}
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search metadata"
          className="h-10 w-full max-w-xs rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="text-muted">Duration</p>
          <p className="mt-1 text-lg">
            {inspection.durationSeconds
              ? formatDuration(inspection.durationSeconds)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="text-muted">Resolution</p>
          <p className="mt-1 text-lg">
            {inspection.width && inspection.height
              ? `${inspection.width} × ${inspection.height}`
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="text-muted">Size</p>
          <p className="mt-1 text-lg">{formatBytes(inspection.fileSize)}</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {grouped.map(({ group, fields }) => (
          <section key={group}>
            <h3 className="mb-2 text-sm font-medium tracking-wide text-accent">{group}</h3>
            <div className="overflow-hidden rounded-xl border border-border">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className="flex justify-between gap-4 border-b border-border/70 px-3 py-2 text-sm last:border-b-0"
                >
                  <span className="shrink-0 text-muted">{field.label}</span>
                  <span className="max-w-[65%] break-all text-right">
                    {field.value}
                    {field.removable ? (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
                        removable
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
