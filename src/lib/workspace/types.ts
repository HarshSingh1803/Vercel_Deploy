export type WorkspaceTab =
  | "instagram"
  | "submissions"
  | "cleaner"
  | "library";

export type LibraryClip = {
  id: string;
  name: string;
  size: number;
  type: string;
  caption: string;
  sanitized: boolean;
  source: "upload" | "cleaner" | "submission" | "instagram";
  createdAt: string;
};

export type InstagramQueueItem = {
  id: string;
  url: string;
  note: string;
  fileName?: string;
  createdAt: string;
};

export type SubmissionRow = {
  id: string;
  title: string;
  url: string;
  caption: string;
  notes: string;
  fileName?: string;
};
