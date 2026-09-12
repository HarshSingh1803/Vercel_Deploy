"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatBytes } from "@/lib/utils";
import type { CleaningHistory, UserPlan } from "@/types/database";

function DashboardBody() {
  const { user } = useAuth();
  const [history, setHistory] = useState<CleaningHistory[]>([]);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const name =
    (user?.user_metadata.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "there";

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const [{ data: rows, error: historyError }, { data: plans, error: planError }] =
          await Promise.all([
            supabase
              .from("cleaning_history")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(5),
            supabase.from("user_plans").select("*").limit(1).maybeSingle(),
          ]);
        if (historyError) throw historyError;
        if (planError) throw planError;
        if (!alive) return;
        setHistory((rows as CleaningHistory[]) || []);
        setPlan((plans as UserPlan | null) || null);
      } catch (caught) {
        if (alive) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load dashboard data.",
          );
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

  const completed = history.filter((row) => row.status === "completed").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Dashboard</p>
          <h1 className="mt-2 font-display text-4xl">Welcome, {name}</h1>
          <p className="mt-2 text-sm text-muted">{user?.email}</p>
        </div>
        <Button href="/account" variant="secondary">
          Account
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          {error} Confirm the SQL schema and RLS policies are applied.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Recent cleans</p>
          <p className="mt-2 font-display text-4xl">{loading ? "—" : completed}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Plan</p>
          <p className="mt-2 font-display text-3xl">{plan?.plan_name || "Free"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Usage</p>
          <p className="mt-2 font-display text-3xl">
            {plan ? `${plan.usage_count} / ${plan.usage_limit}` : "Local unlimited"}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display text-2xl">Upload a video</h2>
        <p className="mt-2 text-sm text-muted">
          Cleaning still happens in the browser. Signing in only stores a history
          record after a successful clean.
        </p>
        <Button href="/clean" className="mt-5">
          Open cleaner
        </Button>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Recent cleaning history</h2>
          <Link href="/history" className="text-sm text-accent">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-foreground/8" />
        ) : history.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No cleans saved yet. Run the cleaner while signed in to populate this list.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {history.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{row.original_file_name}</p>
                  <p className="text-muted">
                    {formatBytes(row.original_file_size)} →{" "}
                    {row.cleaned_file_size ? formatBytes(row.cleaned_file_size) : "—"}
                  </p>
                </div>
                <span className="text-muted">
                  {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function DashboardHome() {
  return (
    <RequireAuth>
      <DashboardBody />
    </RequireAuth>
  );
}
