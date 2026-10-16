"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

type NavLink = { href: string; label: string };

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);

  // The mobile menu is "open" only for the page it was opened on, so it closes
  // by itself whenever the route changes — no effect needed to reset it.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const menuOpen = openFor === pathname;

  const isPro = (session?.user as { plan?: string } | undefined)?.plan === "pro";
  const authed = status === "authenticated";

  const links: NavLink[] = authed
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/new", label: "New render" },
        { href: "/pricing", label: isPro ? "Pro" : "Upgrade" },
        { href: "/account", label: "Account" },
      ]
    : [
        { href: "/pricing", label: "Pricing" },
        { href: "/login", label: "Log in" },
      ];

  // Close the mobile menu on Escape or a tap outside the header.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenFor(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setOpenFor(null);
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

  const desktopLink = (href: string) =>
    pathname === href ? "font-medium" : "text-foreground/70 hover:text-foreground";
  const mobileLink = (href: string) =>
    `block px-4 py-3 text-base ${
      pathname === href ? "font-medium text-indigo-500" : "text-foreground/80"
    }`;

  return (
    <header
      ref={headerRef}
      className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-background/95 backdrop-blur z-40"
    >
      <nav
        className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3"
        aria-label="Primary"
      >
        <Link href="/" className="font-semibold tracking-tight text-lg">
          Room<span className="text-indigo-500">3D</span>
        </Link>

        {status !== "loading" && (
          <>
            {/* Desktop / tablet: inline links */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={desktopLink(l.href)}>
                  {l.label}
                </Link>
              ))}
              {authed ? (
                <button
                  onClick={handleLogout}
                  className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Log out
                </button>
              ) : (
                <Link
                  href="/signup"
                  className="rounded-md bg-indigo-600 text-white px-3 py-1.5 hover:bg-indigo-500"
                >
                  Sign up free
                </Link>
              )}
            </div>

            {/* Mobile: hamburger */}
            <button
              type="button"
              className="md:hidden -mr-2 p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setOpenFor(menuOpen ? null : pathname)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </>
        )}
      </nav>

      {menuOpen && status !== "loading" && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-black/10 dark:border-white/10 bg-background pb-3"
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={mobileLink(l.href)}>
              {l.label}
            </Link>
          ))}
          <div className="px-4 pt-2">
            {authed ? (
              <button
                onClick={handleLogout}
                className="w-full rounded-md border border-black/10 dark:border-white/15 py-2.5 text-base hover:bg-black/5 dark:hover:bg-white/10"
              >
                Log out
              </button>
            ) : (
              <Link
                href="/signup"
                className="block w-full rounded-md bg-indigo-600 text-white py-2.5 text-center text-base font-medium hover:bg-indigo-500"
              >
                Sign up free
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
