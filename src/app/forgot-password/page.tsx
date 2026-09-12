import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="px-4 py-16">
      <Suspense fallback={<div className="mx-auto h-64 max-w-md animate-pulse rounded-2xl bg-foreground/8" />}>
        <AuthForm mode="forgot" />
      </Suspense>
    </div>
  );
}
