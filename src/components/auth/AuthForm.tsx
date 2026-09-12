"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { isSupabaseConfigured } from "@/lib/env";

type Mode = "login" | "signup" | "forgot";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const configured = isSupabaseConfigured();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const titles = {
    login: "Welcome back",
    signup: "Create your GET-RISE account",
    forgot: "Reset your password",
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!configured) {
      setError("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const origin = window.location.origin;

      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        router.push(next);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
          },
        });
        if (authError) throw authError;
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
        setMessage("Check your email to verify your account, then log in.");
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${origin}/auth/callback?next=/reset-password` },
      );
      if (resetError) throw resetError;
      setMessage("If that email exists, a reset link is on its way.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <h1 className="font-display text-3xl">{titles[mode]}</h1>
      <p className="mt-2 text-sm text-muted">
        History and usage stats require an account. Cleaning itself can stay local.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {mode === "signup" ? (
          <Input
            label="Full name"
            name="fullName"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        ) : null}
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {mode !== "forgot" ? (
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            hint={mode === "signup" ? "At least 8 characters." : undefined}
          />
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {message ? <p className="text-sm text-success">{message}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </Button>
      </form>
      <div className="mt-5 space-y-2 text-sm text-muted">
        {mode === "login" ? (
          <>
            <p>
              No account?{" "}
              <Link className="text-accent" href="/signup">
                Sign up
              </Link>
            </p>
            <p>
              <Link className="text-accent" href="/forgot-password">
                Forgot password?
              </Link>
            </p>
          </>
        ) : (
          <p>
            Already registered?{" "}
            <Link className="text-accent" href="/login">
              Log in
            </Link>
          </p>
        )}
      </div>
    </Card>
  );
}
