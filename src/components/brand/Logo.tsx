import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmark?: boolean;
};

export function Logo({ className, markClassName, wordmark = true }: LogoProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 text-foreground", className)}
      aria-label="GET-RISE home"
    >
      <span
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-xl border border-border bg-surface shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent)]",
          markClassName,
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5">
          <path
            d="M6 22c4.5-8 15.5-8 20 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="text-accent"
          />
          <circle cx="16" cy="12" r="3.2" className="fill-rise" />
          <path
            d="M16 7.2V4.8M21.3 9.2l1.6-1.6M10.7 9.2 9.1 7.6"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="text-rise"
          />
        </svg>
      </span>
      {wordmark ? (
        <span className="font-display text-lg tracking-tight">
          GET-<span className="text-accent">RISE</span>
        </span>
      ) : null}
    </Link>
  );
}
