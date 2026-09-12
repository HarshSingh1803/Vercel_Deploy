import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-muted">404</p>
      <h1 className="mt-3 font-display text-4xl">This page drifted off-frame</h1>
      <p className="mt-3 text-sm text-muted">
        The link is missing. Head back to the cleaner or the homepage.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button href="/">Home</Button>
        <Button href="/clean" variant="secondary">
          Cleaner
        </Button>
      </div>
    </div>
  );
}
