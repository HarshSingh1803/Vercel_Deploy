import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <div className="px-4 py-16">
      <Suspense fallback={<div className="mx-auto h-80 max-w-md animate-pulse rounded-2xl bg-foreground/8" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
