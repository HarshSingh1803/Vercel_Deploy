"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type {
  InstagramQueueItem,
  LibraryClip,
  SubmissionRow,
} from "@/lib/workspace/types";

const CAPTION_KEY = "get-rise-default-caption";
const QUEUE_KEY = "get-rise-instagram-queue";

function loadCaption() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CAPTION_KEY) || "";
}

function loadQueue(): InstagramQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(QUEUE_KEY);
    return stored ? (JSON.parse(stored) as InstagramQueueItem[]) : [];
  } catch {
    return [];
  }
}

type WorkspaceContextValue = {
  defaultCaption: string;
  setDefaultCaption: (value: string) => void;
  clips: Array<LibraryClip & { file: File }>;
  addClip: (
    file: File,
    meta: Omit<LibraryClip, "id" | "createdAt" | "name" | "size" | "type"> &
      Partial<Pick<LibraryClip, "name">>,
  ) => void;
  removeClip: (id: string) => void;
  instagramQueue: InstagramQueueItem[];
  addInstagramItem: (item: Omit<InstagramQueueItem, "id" | "createdAt">) => void;
  removeInstagramItem: (id: string) => void;
  submissions: SubmissionRow[];
  setSubmissions: (rows: SubmissionRow[]) => void;
  attachSubmissionFile: (id: string, file: File) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [defaultCaption, setDefaultCaptionState] = useState(loadCaption);
  const [instagramQueue, setInstagramQueue] = useState(loadQueue);
  const [clips, setClips] = useState<Array<LibraryClip & { file: File }>>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);

  const setDefaultCaption = useCallback((value: string) => {
    setDefaultCaptionState(value);
    window.localStorage.setItem(CAPTION_KEY, value);
  }, []);

  const addClip = useCallback(
    (
      file: File,
      meta: Omit<LibraryClip, "id" | "createdAt" | "name" | "size" | "type"> &
        Partial<Pick<LibraryClip, "name">>,
    ) => {
      setClips((current) => [
        {
          id: crypto.randomUUID(),
          name: meta.name || file.name,
          size: file.size,
          type: file.type || "video",
          caption: meta.caption,
          sanitized: meta.sanitized,
          source: meta.source,
          createdAt: new Date().toISOString(),
          file,
        },
        ...current,
      ]);
    },
    [],
  );

  const removeClip = useCallback((id: string) => {
    setClips((current) => current.filter((clip) => clip.id !== id));
  }, []);

  const addInstagramItem = useCallback(
    (item: Omit<InstagramQueueItem, "id" | "createdAt">) => {
      setInstagramQueue((current) => {
        const next = [
          {
            ...item,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
          ...current,
        ];
        window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const removeInstagramItem = useCallback((id: string) => {
    setInstagramQueue((current) => {
      const next = current.filter((item) => item.id !== id);
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const attachSubmissionFile = useCallback(
    (id: string, file: File) => {
      setSubmissions((current) =>
        current.map((row) =>
          row.id === id ? { ...row, fileName: file.name } : row,
        ),
      );
      addClip(file, {
        caption: defaultCaption,
        sanitized: false,
        source: "submission",
        name: file.name,
      });
    },
    [addClip, defaultCaption],
  );

  const value = useMemo(
    () => ({
      defaultCaption,
      setDefaultCaption,
      clips,
      addClip,
      removeClip,
      instagramQueue,
      addInstagramItem,
      removeInstagramItem,
      submissions,
      setSubmissions,
      attachSubmissionFile,
    }),
    [
      addClip,
      addInstagramItem,
      attachSubmissionFile,
      clips,
      defaultCaption,
      instagramQueue,
      removeClip,
      removeInstagramItem,
      setDefaultCaption,
      submissions,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
