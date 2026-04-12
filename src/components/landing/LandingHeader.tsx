"use client";

import Link from "next/link";
import { useState, useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useLandingTheme } from "@/components/landing/LandingThemeProvider";
import { Moon, Sun, Lock } from "lucide-react";

const HEADER_H = 48; // px — single source of truth
const NAV_BG_SELECTOR = "[data-landing-nav-bg]";

const HOME_NAV = [
  { href: "#pricing", key: "landing.home.nav.pricing" as const },
  { href: "#features", key: "landing.home.nav.features" as const },
  { href: "#why", key: "landing.home.nav.why" as const },
  { href: "#connect", key: "landing.home.nav.connect" as const },
  { href: "#migrate", key: "landing.home.nav.migrate" as const },
] as const;

const RENTALS_NAV = [
  { href: "/#homepage", label: "Homepage", teal: false },
  { href: "/about", label: "About Us", teal: false },
  { href: "/things-to-do", label: "Things to Do", teal: false },
  { href: "/contact", label: "Contact", teal: false },
  { href: "/rentals", label: "Search Properties", teal: true },
] as const;

function probeNavBandDark(): boolean {
  if (typeof document === "undefined") return true;
  const x = Math.max(0, window.innerWidth / 2);
  /** Sample behind the middle of the fixed header strip */
  const y = Math.min(HEADER_H / 2, Math.max(0, window.innerHeight - 1));
  const sections = document.querySelectorAll(NAV_BG_SELECTOR);
  for (const el of sections) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.left <= x && r.right >= x && r.top <= y && r.bottom >= y) {
      return el.getAttribute("data-landing-nav-bg") === "dark";
    }
  }
  return false;
}

export function LandingHeader() {
  const { t } = useLocalizationContext();
  const { theme, toggleTheme } = useLandingTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [navBandDark, setNavBandDark] = useState(true);

  const isHome = pathname === "/";
  const isRentals = pathname?.startsWith("/rentals") ?? false;
  const isLight =
    (isHome && theme === "light") ||
    isRentals ||
    pathname?.startsWith("/properties") ||
    pathname?.startsWith("/all-in-one-calendar") ||
    pathname?.startsWith("/contact");

  const dynamicHome = isHome && theme === "light";
  const overDarkBg = dynamicHome ? navBandDark : !isLight;

  useLayoutEffect(() => {
    if (!dynamicHome) return;
    const sync = () => setNavBandDark(probeNavBandDark());
    sync();
    requestAnimationFrame(sync);
    queueMicrotask(sync);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("hashchange", sync);
    window.addEventListener("load", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("load", sync);
    };
  }, [dynamicHome]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const headerBg = isRentals
    ? "border-b border-slate-100 bg-white"
    : !isLight
      ? "border-b border-white/10 bg-slate-950/25 backdrop-blur-md"
      : overDarkBg
        ? "border-b border-white/15 bg-black/[0.12] backdrop-blur-md supports-[backdrop-filter]:bg-black/10"
        : "border-b border-slate-200/25 bg-white/[0.06] backdrop-blur-md supports-[backdrop-filter]:bg-white/[0.05]";

  const linkClass = () => {
    if (!isLight) {
      return `hidden lg:inline px-2 py-1 text-[13px] font-medium tracking-wide text-white/85 transition-opacity touch-manipulation hover:opacity-90`;
    }
    if (overDarkBg) {
      return `hidden lg:inline px-2 py-1 text-[13px] font-medium tracking-wide text-white/90 transition-opacity touch-manipulation hover:opacity-85`;
    }
    return `hidden lg:inline px-2 py-1 text-[13px] font-medium tracking-wide text-slate-900 transition-opacity touch-manipulation hover:opacity-70`;
  };

  const logoSrc = isRentals
    ? "/images/logo-light.svg"
    : !isLight || (isLight && overDarkBg)
      ? "/images/logo-dark.svg"
      : "/images/logo-light.svg";

  const logoShadow = !isLight
    ? "drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
    : overDarkBg
      ? "drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)]"
      : "drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)]";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-200 ${headerBg}`}
        style={{ height: HEADER_H }}
        suppressHydrationWarning
      >
        <div
          className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <Link
            href="/"
            className="flex shrink-0 select-none items-center touch-manipulation transition-opacity hover:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="SmartStart PM"
              height={28}
              className={logoShadow}
              style={{ height: 28, width: "auto", display: "block" }}
            />
          </Link>

          {isHome ? (
            <div className="hidden min-w-0 flex-1 justify-center px-2 lg:flex">
              <nav
                className="flex max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap xl:gap-5 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
                aria-label="Page sections"
              >
                {HOME_NAV.map(({ href, key }) => (
                  <Link key={href} href={href} className={linkClass()}>
                    {t(key)}
                  </Link>
                ))}
                <Link href="/auth/signin" className={linkClass()}>
                  {t("landing.cta.portal")}
                </Link>
              </nav>
            </div>
          ) : isRentals ? (
            <div className="hidden min-w-0 flex-1 justify-center px-2 lg:flex">
              <nav
                className="flex max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap xl:gap-5 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
                aria-label="Rentals navigation"
              >
                {RENTALS_NAV.map(({ href, label, teal }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`hidden lg:inline px-2 py-1 text-[13px] font-medium tracking-wide transition-opacity touch-manipulation hover:opacity-70 ${
                      teal ? "text-[#0ABAB5]" : "text-slate-900"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isHome && (
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === "light" ? t("landing.home.theme.toDark") : t("landing.home.theme.toLight")}
                aria-pressed={theme === "dark"}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-opacity touch-manipulation ${
                  isLight
                    ? overDarkBg
                      ? "text-white hover:opacity-80"
                      : "text-slate-900 hover:opacity-75"
                    : "text-white/90 hover:opacity-90"
                }`}
              >
                {theme === "light" ? <Moon className="h-4 w-4" strokeWidth={2} /> : <Sun className="h-4 w-4" strokeWidth={2} />}
              </button>
            )}

            <LanguageSwitcher
              variant={isLight ? "light" : "dark"}
              align="right"
              ghost={isLight}
              onDarkBackdrop={isLight && overDarkBg}
            />

            <button
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`flex h-8 w-8 flex-col items-center justify-center gap-[5px] rounded-md transition-opacity touch-manipulation lg:hidden ${
                isLight
                  ? overDarkBg
                    ? "text-white hover:opacity-80"
                    : "text-slate-900 hover:opacity-75"
                  : "text-white/80 hover:opacity-90"
              }`}
            >
              <span
                className={`block h-[1px] w-[18px] rounded-full transition-all duration-300 ${isLight ? (overDarkBg ? "bg-white" : "bg-slate-800") : "bg-white/80"} ${open ? "translate-y-[6px] rotate-45" : ""}`}
              />
              <span
                className={`block h-[1px] w-[18px] rounded-full transition-all duration-300 ${isLight ? (overDarkBg ? "bg-white" : "bg-slate-800") : "bg-white/80"} ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`block h-[1px] w-[18px] rounded-full transition-all duration-300 ${isLight ? (overDarkBg ? "bg-white" : "bg-slate-800") : "bg-white/80"} ${open ? "-translate-y-[6px] -rotate-45" : ""}`}
              />
            </button>

            {isRentals ? (
              <>
                <Link
                  href="/auth/signin"
                  className="hidden h-8 items-center gap-1 px-2 text-[12px] font-medium text-slate-800 transition-opacity touch-manipulation hover:opacity-70 sm:flex"
                >
                  <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="hidden h-8 items-center px-2 text-[12px] font-medium text-slate-800 transition-opacity touch-manipulation hover:opacity-70 sm:flex"
                >
                  + Sign Up
                </Link>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className={`hidden h-8 items-center px-2 text-[12px] transition-opacity touch-manipulation sm:flex ${
                  isHome ? "lg:hidden" : ""
                } ${
                  isLight
                    ? overDarkBg
                      ? "font-medium text-white/95 hover:opacity-85"
                      : "font-medium text-slate-900 hover:opacity-75"
                    : "font-medium text-white/90 hover:opacity-90"
                }`}
              >
                {t("landing.cta.portal")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[2px] lg:hidden"
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
          className={`mx-3 mt-1 overflow-hidden rounded-2xl border shadow-xl backdrop-blur-2xl ${
            isLight
              ? "border-white/50 bg-white/75"
              : "border-white/15 bg-slate-950/80"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="p-2">
            {isHome && (
              <>
                {HOME_NAV.map(({ href, key }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex h-11 items-center justify-between rounded-xl px-3 text-[14px] transition-all touch-manipulation ${
                      isLight ? "text-slate-900 hover:bg-slate-50" : "text-white hover:bg-white/8"
                    }`}
                    style={{ fontWeight: 500 }}
                  >
                    {t(key)}
                    <span className={`text-xs ${isLight ? "text-slate-400" : "text-white/30"}`}>→</span>
                  </Link>
                ))}
                <div className={`my-1 border-t ${isLight ? "border-slate-100" : "border-white/8"}`} />
              </>
            )}
            {isRentals && (
              <>
                {RENTALS_NAV.map(({ href, label, teal }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex h-11 items-center justify-between rounded-xl px-3 text-[14px] transition-all touch-manipulation hover:bg-slate-50"
                    style={{ fontWeight: 500, color: teal ? "#0ABAB5" : "#1e293b" }}
                  >
                    {label}
                    <span className="text-xs text-slate-400">→</span>
                  </Link>
                ))}
                <div className="my-1 border-t border-slate-100" />
              </>
            )}
            {isHome && (
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setOpen(false);
                }}
                className={`flex h-11 w-full items-center justify-between rounded-xl px-3 text-[14px] transition-all touch-manipulation ${
                  isLight ? "text-slate-900 hover:bg-slate-50" : "text-white hover:bg-white/8"
                }`}
                style={{ fontWeight: 500 }}
              >
                {theme === "light" ? t("landing.home.theme.toDark") : t("landing.home.theme.toLight")}
                <span className={isLight ? "text-slate-400" : "text-white/30"}>
                  {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </span>
              </button>
            )}
            <div className="flex h-11 items-center gap-2 px-3">
              <span className={`flex-1 text-[13px] ${isLight ? "text-slate-500" : "text-white/50"}`}>
                {t("common.language")}
              </span>
              <LanguageSwitcher variant={isLight ? "light" : "dark"} align="right" ghost={false} />
            </div>
            <div className={`my-1 border-t ${isLight ? "border-slate-100" : "border-white/8"}`} />
            {isRentals ? (
              <>
                <Link
                  href="/auth/signin"
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center gap-2 rounded-xl px-3 text-[14px] font-medium text-slate-800 transition-all touch-manipulation hover:bg-slate-50"
                >
                  <Lock className="h-4 w-4" strokeWidth={2} />
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setOpen(false)}
                  className="flex h-11 items-center justify-between rounded-xl px-3 text-[14px] font-medium text-slate-800 transition-all touch-manipulation hover:bg-slate-50"
                >
                  + Sign Up
                  <span className="text-xs text-slate-400">→</span>
                </Link>
              </>
            ) : (
              <Link
                href="/auth/signin"
                onClick={() => setOpen(false)}
                className={`flex h-11 items-center justify-between rounded-xl px-3 text-[14px] transition-all touch-manipulation ${
                  isLight ? "text-slate-900 hover:bg-slate-50" : "text-white hover:bg-white/8"
                }`}
                style={{ fontWeight: 500 }}
              >
                {t("landing.cta.signin")}
                <span className={`text-xs ${isLight ? "text-slate-400" : "text-white/30"}`}>→</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
