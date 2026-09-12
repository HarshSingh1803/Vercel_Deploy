"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Card } from "@/components/ui/Card";
import { formatBytes } from "@/lib/utils";
import type { CleaningHistory } from "@/types/database";

function HistoryBody() {
  const [rows, setRows] = useState<CleaningHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("cleaning_history")
          .select("*")
          .order("created_at", { ascending: false });
        if (queryError) throw queryError;
        if (alive) setRows((data as CleaningHistory[]) || []);
      } catch (caught) {
        if (alive) {
          setError(caught instanceof Error ? caught.message : "Could not load history.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">Cleaning history</h1>
      <p className="mt-2 text-sm text-muted">
        Only activity records are stored. Original and cleaned videos are not kept on GET-RISE servers.
      </p>
      <Card className="mt-6 overflow-x-auto">
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-foreground/8" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">No history yet.</p>
        ) : (
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 font-medium">File</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Original</th>
                <th className="py-2 font-medium">Cleaned</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70">
                  <td className="py-3 pr-4">{row.original_file_name}</td>
                  <td className="py-3 pr-4">{row.file_type}</td>
                  <td className="py-3 pr-4">{formatBytes(row.original_file_size)}</td>
                  <td className="py-3 pr-4">
                    {row.cleaned_file_size ? formatBytes(row.cleaned_file_size) : "—"}
                  </td>
                  <td className="py-3 pr-4">{row.status}</td>
                  <td className="py-3">{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function HistoryTable() {
  return (
    <RequireAuth>
      <HistoryBody />
    </RequireAuth>
  );
}
