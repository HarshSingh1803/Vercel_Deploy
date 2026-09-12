"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && configured && !user) {
      router.replace("/login?next=/dashboard");
    }
  }, [configured, loading, router, user]);

  if (!configured) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-3xl">Connect Supabase</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Dashboard, history, and profiles need Supabase. Copy `.env.example` to
          `.env.local`, add your project URL and anon key, then restart the app.
          Video cleaning still works without an account at{" "}
          <a className="text-accent" href="/clean">
            /clean
          </a>
          .
        </p>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="h-32 animate-pulse rounded-2xl bg-foreground/8" />
      </div>
    );
  }

  return <>{children}</>;
}
