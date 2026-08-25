"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isPro = (session?.user as { plan?: string } | undefined)?.plan === "pro";

  async function handleLogout() {
    // Clear any locally cached sketch/render data before ending the session,
    // per the privacy policy's "logout revokes cached local data" clause.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("room3d:"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-background/90 backdrop-blur z-40">
      <nav
        className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3"
        aria-label="Primary"
      >
        <Link href="/" className="font-semibold tracking-tight text-lg">
          Room<span className="text-indigo-500">3D</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {status === "authenticated" ? (
            <>
              <Link
                href="/dashboard"
                className={pathname === "/dashboard" ? "font-medium" : "text-foreground/70 hover:text-foreground"}
              >
                Dashboard
              </Link>
              <Link
                href="/new"
                className={pathname === "/new" ? "font-medium" : "text-foreground/70 hover:text-foreground"}
              >
                New sketch
              </Link>
              <Link
                href="/pricing"
                className={pathname === "/pricing" ? "font-medium" : "text-foreground/70 hover:text-foreground"}
              >
                {isPro ? "Pro" : "Upgrade"}
              </Link>
              <Link
                href="/account"
                className={pathname === "/account" ? "font-medium" : "text-foreground/70 hover:text-foreground"}
              >
                Account
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Log out
              </button>
            </>
          ) : status === "loading" ? (
            <div className="h-8 w-24" />
          ) : (
            <>
              <Link href="/pricing" className="text-foreground/70 hover:text-foreground">
                Pricing
              </Link>
              <Link href="/login" className="text-foreground/70 hover:text-foreground">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-500"
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
