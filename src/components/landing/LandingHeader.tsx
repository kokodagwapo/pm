"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";

const HEADER_H = 48; // px — single source of truth

export function LandingHeader() {
  const { t } = useLocalizationContext();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isLight =
    pathname?.startsWith("/rentals") ||
    pathname?.startsWith("/properties") ||
    pathname?.startsWith("/contact");

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const headerBg = isLight
    ? "bg-white/98 border-b border-slate-100"
    : scrolled
    ? "bg-slate-950/97 border-b border-white/5"
    : "bg-transparent border-b border-transparent";

  return (
    <>
      {/* ── Main bar ───────────────────────────────────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${headerBg}`}
        style={{ height: HEADER_H }}
      >
        <div
          className="h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center select-none touch-manipulation shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isLight ? "/images/logo-light.svg" : "/images/logo-dark.svg"}
              alt="SmartStartPM"
              height={28}
              style={{ height: 28, width: "auto", display: "block" }}
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            <Link
              href="/rentals"
              className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                isLight
                  ? "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`}
              style={{ fontWeight: 300 }}
            >
              {t("nav.rentals")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher
              variant={isLight ? "light" : "dark"}
              align="right"
            />

            {/* Hamburger — mobile */}
            <button
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`md:hidden w-8 h-8 flex flex-col items-center justify-center gap-[5px] rounded-lg transition-all touch-manipulation ${
                isLight ? "text-slate-600 hover:bg-slate-100" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <span className={`block w-[18px] h-[1px] rounded-full transition-all duration-300 ${isLight ? "bg-slate-700" : "bg-white/80"} ${open ? "rotate-45 translate-y-[6px]" : ""}`} />
              <span className={`block w-[18px] h-[1px] rounded-full transition-all duration-300 ${isLight ? "bg-slate-700" : "bg-white/80"} ${open ? "opacity-0" : ""}`} />
              <span className={`block w-[18px] h-[1px] rounded-full transition-all duration-300 ${isLight ? "bg-slate-700" : "bg-white/80"} ${open ? "-rotate-45 -translate-y-[6px]" : ""}`} />
            </button>

            {/* Portal CTA — hidden on xs, visible on sm+ */}
            <Link
              href="/auth/signin"
              className={`hidden sm:flex h-8 items-center px-3.5 rounded-lg text-[12px] transition-all touch-manipulation ${
                isLight
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-white/10 text-white/90 border border-white/15 hover:bg-white/20"
              }`}
              style={{ fontWeight: 500 }}
            >
              {t("landing.cta.portal")}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Backdrop ───────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/15 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Mobile dropdown ────────────────────────────────────────────── */}
      <div
        className={`fixed inset-x-0 top-0 z-[45] md:hidden transition-all duration-200 ease-out ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
        style={{ paddingTop: HEADER_H }}
      >
        <div
          className={`mx-3 mt-1 rounded-2xl overflow-hidden border shadow-xl ${
            isLight ? "bg-white border-slate-100" : "bg-slate-950 border-white/10"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="p-2">
            <Link
              href="/rentals"
              onClick={() => setOpen(false)}
              className={`flex items-center h-11 px-3 rounded-xl text-[14px] transition-all touch-manipulation ${
                isLight
                  ? "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  : "text-white/80 hover:bg-white/8 hover:text-white"
              }`}
              style={{ fontWeight: 300 }}
            >
              {t("nav.rentals")}
            </Link>
            <div className={`my-1 border-t ${isLight ? "border-slate-100" : "border-white/8"}`} />
            {/* Language switcher row in mobile menu */}
            <div className="flex items-center h-11 px-3 gap-2">
              <span className={`text-[13px] flex-1 ${isLight ? "text-slate-500" : "text-white/50"}`}>{t("common.language")}</span>
              <LanguageSwitcher variant={isLight ? "light" : "dark"} align="right" />
            </div>
            <div className={`my-1 border-t ${isLight ? "border-slate-100" : "border-white/8"}`} />
            <Link
              href="/auth/signin"
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between h-11 px-3 rounded-xl text-[14px] transition-all touch-manipulation ${
                isLight
                  ? "text-slate-900 hover:bg-slate-50"
                  : "text-white hover:bg-white/8"
              }`}
              style={{ fontWeight: 500 }}
            >
              {t("landing.cta.signin")}
              <span className={`text-xs ${isLight ? "text-slate-400" : "text-white/30"}`}>→</span>
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
