"use client";

import dynamic from "next/dynamic";

export const WorkspaceEntry = dynamic(
  () => import("@/components/workspace/WorkspaceShell").then((mod) => mod.WorkspaceShell),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-16 animate-pulse rounded-full bg-foreground/8" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-foreground/8" />
      </div>
    ),
  },
);
