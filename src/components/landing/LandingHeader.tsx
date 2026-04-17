"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const HEADER_H = 72;

const HOME_NAV = [
  { href: "#features", label: "Features" },
  { href: "#why", label: "Why switch" },
  { href: "#connect", label: "Integrations" },
  { href: "#migrate", label: "Migration" },
] as const;

const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/rentals", label: "Rentals" },
  { href: "/contact", label: "Contact" },
] as const;

export function LandingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isHome = pathname === "/";
  const navItems = isHome ? HOME_NAV : PUBLIC_NAV;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl"
        style={{ height: HEADER_H }}
      >
        <div
          className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <Link
            href="/"
            className="flex shrink-0 select-none items-center transition-opacity hover:opacity-90"
          >
            <img
              src="/images/logo-light.svg"
              alt="SmartStart PM"
              height={28}
              className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
              style={{ height: 28, width: "auto", display: "block" }}
            />
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center px-2 lg:flex">
            <nav
              className="flex max-w-full items-center gap-5 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
              aria-label={isHome ? "Page sections" : "Public navigation"}
            >
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-2 py-1 text-[13px] font-medium tracking-wide text-slate-700 transition-opacity hover:opacity-65"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/auth/signin"
              className="hidden h-9 items-center rounded-xl px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/rentals"
              className="hidden h-9 items-center rounded-xl bg-slate-900 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 sm:inline-flex"
            >
              View rentals
            </Link>
            <button
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 lg:hidden"
            >
              {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/10 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={`fixed inset-x-0 top-0 z-[45] transition-all duration-200 ease-out lg:hidden ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        style={{ paddingTop: HEADER_H }}
      >
        <div
          className="mx-3 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="p-2">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-between rounded-xl px-3 text-[14px] font-medium text-slate-900 transition-all hover:bg-slate-50"
              >
                {label}
                <span className="text-xs text-slate-400">→</span>
              </Link>
            ))}

            <div className="mt-2 grid gap-2 px-1 pb-1">
              <Link
                href="/auth/signin"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-[14px] font-medium text-slate-900 transition-all hover:bg-slate-50"
              >
                Sign in
              </Link>
              <Link
                href="/rentals"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center rounded-xl bg-slate-900 text-[14px] font-semibold text-white transition-all hover:bg-slate-800"
              >
                View rentals
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
