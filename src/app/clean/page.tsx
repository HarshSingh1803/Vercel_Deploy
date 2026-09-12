import type { Metadata } from "next";
import { WorkspaceEntry } from "@/components/workspace/WorkspaceEntry";

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Inspect metadata, import submissions, and keep a local publishing library with GET-RISE.",
};

export default function CleanPage() {
  return <WorkspaceEntry />;
}
