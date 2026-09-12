import { cn } from "@/lib/utils";

type InputProps = {
  label: string;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id || props.name;

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        id={inputId}
        className={cn(
          "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent",
          error && "border-danger",
          className,
        )}
        {...props}
      />
      {error ? (
        <span className="text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
