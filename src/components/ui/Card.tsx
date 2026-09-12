import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-6 shadow-[0_20px_60px_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
