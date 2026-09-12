"use client";

import dynamic from "next/dynamic";

export const VideoCleanerEntry = dynamic(
  () => import("@/components/cleaner/VideoCleaner").then((mod) => mod.VideoCleaner),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-64 animate-pulse rounded-2xl bg-foreground/8" />
      </div>
    ),
  },
);
