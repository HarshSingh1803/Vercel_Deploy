"use client";

import { useState } from "react";
import { VideoCleaner } from "@/components/cleaner/VideoCleaner";
import { InstagramTab } from "@/components/workspace/InstagramTab";
import { PublishingTab } from "@/components/workspace/PublishingTab";
import { SubmissionTab } from "@/components/workspace/SubmissionTab";
import { WorkspaceProvider, useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { cn } from "@/lib/utils";
import type { WorkspaceTab } from "@/lib/workspace/types";

const TABS: Array<{
  id: WorkspaceTab;
  label: string;
  badge?: string;
  activeClass: string;
}> = [
  {
    id: "instagram",
    label: "Instagram Downloader",
    activeClass: "bg-violet-500/20 text-violet-100",
  },
  {
    id: "submissions",
    label: "Submission Import",
    badge: "PDF & SHEETS",
    activeClass: "bg-violet-500/20 text-violet-100",
  },
  {
    id: "cleaner",
    label: "Local Video Cleaner",
    activeClass: "bg-foreground/10 text-foreground",
  },
  {
    id: "library",
    label: "Publishing & Library",
    badge: "PRO",
    activeClass: "bg-emerald-400 text-emerald-950",
  },
];

function TabIcon({ id }: { id: WorkspaceTab }) {
  const className = "h-4 w-4";
  if (id === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  if (id === "submissions") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path d="M14 3v6h6M8 13h8M8 17h6" />
      </svg>
    );
  }
  if (id === "cleaner") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function WorkspaceInner() {
  const [tab, setTab] = useState<WorkspaceTab>("library");
  const { addClip, defaultCaption } = useWorkspace();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex justify-center">
        <div className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-surface/80 p-1.5 shadow-[0_20px_60px_color-mix(in_srgb,var(--foreground)_8%,transparent)]">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition sm:flex-none sm:px-4",
                  active ? item.activeClass : "hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                <TabIcon id={item.id} />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.badge ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                      item.id === "library"
                        ? "bg-emerald-950/20 text-current"
                        : "bg-violet-400/20 text-violet-200",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "instagram" ? <InstagramTab /> : null}
      {tab === "submissions" ? <SubmissionTab /> : null}
      {tab === "cleaner" ? (
        <VideoCleaner
          embedded
          onAddToLibrary={(file, sanitized) =>
            addClip(file, {
              caption: defaultCaption,
              sanitized,
              source: "cleaner",
            })
          }
        />
      ) : null}
      {tab === "library" ? <PublishingTab /> : null}
    </div>
  );
}

export function WorkspaceShell() {
  return (
    <WorkspaceProvider>
      <WorkspaceInner />
    </WorkspaceProvider>
  );
}
