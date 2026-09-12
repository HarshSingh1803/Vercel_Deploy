import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm leading-6 text-muted">
            Privacy-first video metadata cleaning that runs in your browser.
            Files stay on your device unless you choose to save history after login.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Product</p>
            <Link className="block text-muted hover:text-foreground" href="/clean">
              Clean a video
            </Link>
            <Link className="block text-muted hover:text-foreground" href="/#how-it-works">
              How it works
            </Link>
            <Link className="block text-muted hover:text-foreground" href="/dashboard">
              Dashboard
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Account</p>
            <Link className="block text-muted hover:text-foreground" href="/login">
              Log in
            </Link>
            <Link className="block text-muted hover:text-foreground" href="/signup">
              Sign up
            </Link>
            <Link className="block text-muted hover:text-foreground" href="/history">
              History
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Trust</p>
            <Link className="block text-muted hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="block text-muted hover:text-foreground" href="/#faq">
              FAQ
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} GET-RISE. Independent software. Not affiliated with the reference site.
        </p>
      </div>
    </footer>
  );
}
