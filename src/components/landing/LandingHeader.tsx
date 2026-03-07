"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Menu } from "lucide-react";

const mobileMenuLinks = [
  { href: "/rentals", label: "Rentals" },
  { href: "/rentals?type=sale", label: "Sales" },
  { href: "/management", label: "Management" },
];

export function LandingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLightPage =
    pathname?.startsWith("/rentals") ||
    pathname?.startsWith("/properties") ||
    pathname?.startsWith("/contact");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const textClass = isLightPage ? "text-slate-900" : "text-white";
  const textMutedClass = isLightPage ? "text-slate-600" : "text-white/90";
  const textHoverClass = isLightPage
    ? "hover:text-slate-900 hover:bg-slate-100"
    : "hover:text-white hover:bg-white/20";
  const logoBgClass = isLightPage ? "bg-slate-200 ring-slate-300" : "bg-white/20 ring-white/30";
  const logoHoverClass = isLightPage ? "group-hover:ring-slate-400" : "group-hover:ring-white/50";
  const btnClass = isLightPage
    ? "bg-slate-900 border-slate-800 text-white hover:bg-slate-800"
    : "bg-white/10 border-white/20 text-white/90 hover:text-white hover:bg-white/20";
  const hamburgerBg = isLightPage ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 text-white";
  const menuBg = isLightPage ? "bg-white shadow-xl border border-slate-200" : "bg-[#0f2340]/95 border border-white/10 shadow-2xl";
  const menuText = isLightPage ? "text-slate-800" : "text-white";
  const menuItemHover = isLightPage ? "hover:bg-slate-50 hover:text-slate-900" : "hover:bg-white/10 hover:text-white";
  const menuMuted = isLightPage ? "text-slate-500" : "text-white/60";
  const menuDivider = isLightPage ? "border-slate-100" : "border-white/10";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 md:px-8 py-3 sm:py-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:pt-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo */}
          <Link
            href="/"
            className={`flex items-center gap-1.5 sm:gap-2 group min-h-[44px] touch-manipulation ${textClass}`}
          >
            <div
              className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full backdrop-blur-md flex items-center justify-center ring-2 transition-all shrink-0 ${logoBgClass} ${logoHoverClass}`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
              </svg>
            </div>
            <span className="font-[var(--font-montserrat)] font-semibold text-base sm:text-lg tracking-wide truncate">
              SmartStartPM
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Hamburger button — mobile & tablet */}
            <button
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={`md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full backdrop-blur-md transition-all touch-manipulation ${hamburgerBg}`}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Client Portal — always visible */}
            <Link
              href="/auth/signin"
              className={`min-h-[44px] flex items-center px-4 sm:px-5 py-2.5 rounded-full backdrop-blur-xl border ${btnClass} transition-all text-sm font-medium touch-manipulation`}
            >
              Client Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile / Tablet slide-down menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`fixed top-0 left-0 right-0 z-45 md:hidden transition-all duration-300 ease-out ${
          mobileOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
        style={{ zIndex: 45 }}
      >
        <div
          className={`mx-3 mt-[72px] rounded-2xl backdrop-blur-xl overflow-hidden ${menuBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="p-3">
            <p className={`text-xs font-semibold uppercase tracking-widest px-3 py-2 ${menuMuted}`}>
              Menu
            </p>
            {mobileMenuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center min-h-[48px] px-3 py-3 rounded-xl text-sm font-medium transition-all touch-manipulation ${menuText} ${menuItemHover}`}
              >
                {link.label}
              </Link>
            ))}
            <div className={`border-t my-2 ${menuDivider}`} />
            <Link
              href="/auth/signin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center min-h-[48px] px-3 py-3 rounded-xl text-sm font-semibold transition-all touch-manipulation ${menuText} ${menuItemHover}`}
            >
              Client Portal →
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
