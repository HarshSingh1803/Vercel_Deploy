import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="px-4 py-16">
      <Suspense fallback={<div className="mx-auto h-80 max-w-md animate-pulse rounded-2xl bg-foreground/8" />}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
