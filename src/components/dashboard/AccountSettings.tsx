"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Profile, UserPlan } from "@/types/database";

function AccountBody() {
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState(
    (user?.user_metadata.full_name as string | undefined) || "",
  );
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const [{ data: profile }, { data: currentPlan }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("user_plans").select("*").limit(1).maybeSingle(),
      ]);
      if (!alive) return;
      const typed = profile as Profile | null;
      if (typed?.full_name) setFullName(typed.full_name);
      setPlan((currentPlan as UserPlan | null) || null);
    }
    if (user) void load();
    return () => {
      alive = false;
    };
  }, [user]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;
      await supabase.auth.updateUser({ data: { full_name: fullName } });
      await refresh();
      setMessage("Profile updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">Account</h1>
      <Card>
        <form className="space-y-4" onSubmit={save}>
          <Input label="Email" value={user?.email || ""} disabled />
          <Input
            label="Full name"
            name="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {message ? <p className="text-sm text-success">{message}</p> : null}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Card>
      <Card>
        <h2 className="font-display text-2xl">Plan</h2>
        <p className="mt-2 text-sm text-muted">
          {plan
            ? `${plan.plan_name} · ${plan.usage_count} of ${plan.usage_limit} recorded cleans`
            : "No plan row yet. Apply the SQL schema to enable usage tracking."}
        </p>
      </Card>
    </div>
  );
}

export function AccountSettings() {
  return (
    <RequireAuth>
      <AccountBody />
    </RequireAuth>
  );
}
