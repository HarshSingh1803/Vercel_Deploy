"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/clean", label: "Workspace" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition hover:text-foreground",
                pathname === link.href && "text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {loading ? (
            <span className="hidden h-10 w-24 animate-pulse rounded-full bg-foreground/10 md:block" />
          ) : user ? (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
                  {(user.user_metadata.full_name || user.email || "U")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                Account
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl"
                >
                  <Link className="block px-3 py-2 text-sm hover:bg-foreground/5" href="/dashboard">
                    Dashboard
                  </Link>
                  <Link className="block px-3 py-2 text-sm hover:bg-foreground/5" href="/history">
                    History
                  </Link>
                  <Link className="block px-3 py-2 text-sm hover:bg-foreground/5" href="/account">
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-foreground/5"
                    onClick={handleSignOut}
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button href="/login" variant="ghost" size="sm">
                Log in
              </Button>
              <Button href="/signup" size="sm">
                Sign up
              </Button>
            </div>
          )}
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-border md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">Menu</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-border px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/history" onClick={() => setOpen(false)}>
                  History
                </Link>
                <Link href="/account" onClick={() => setOpen(false)}>
                  Profile
                </Link>
                <button type="button" className="text-left" onClick={handleSignOut}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
