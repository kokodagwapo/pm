"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Menu, Home } from "lucide-react";

const mobileMenuLinks = [
  { href: "/rentals", label: "Rentals" },
  { href: "/rentals?type=sale", label: "Sales" },
  { href: "/management", label: "Management" },
];

export function LandingHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isLightPage =
    pathname?.startsWith("/rentals") ||
    pathname?.startsWith("/properties") ||
    pathname?.startsWith("/contact");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const headerBg = isLightPage
    ? "bg-white/98 backdrop-blur-md border-b border-slate-100 shadow-[0_1px_0_rgba(0,0,0,0.06)]"
    : scrolled
    ? "bg-slate-950/96 backdrop-blur-md shadow-md"
    : "bg-transparent";

  const textClass = isLightPage ? "text-slate-900" : "text-white";
  const hamburgerBg = isLightPage
    ? "bg-slate-100 hover:bg-slate-200 text-slate-600 active:bg-slate-300"
    : "bg-white/10 hover:bg-white/20 text-white";
  const btnClass = isLightPage
    ? "bg-slate-900 border-transparent text-white hover:bg-slate-800 active:bg-slate-950"
    : "bg-white/10 border-white/20 text-white/90 hover:text-white hover:bg-white/20";
  const menuBg = isLightPage
    ? "bg-white shadow-2xl border border-slate-100"
    : "bg-slate-950 border border-white/10 shadow-2xl";
  const menuText = isLightPage ? "text-slate-800" : "text-white";
  const menuItemHover = isLightPage
    ? "hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
    : "hover:bg-white/10 hover:text-white";
  const menuMuted = isLightPage ? "text-slate-400" : "text-white/40";
  const menuDivider = isLightPage ? "border-slate-100" : "border-white/10";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 transition-all duration-200 ${headerBg}`}
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo */}
          <Link
            href="/"
            className={`flex items-center gap-2 group min-h-[44px] touch-manipulation select-none ${textClass}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                isLightPage ? "bg-slate-900 text-white" : "bg-white/15 text-white"
              }`}
            >
              <Home className="w-4 h-4" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-lg tracking-tight" style={{ fontFamily: "var(--font-montserrat, system-ui)" }}>
                smart<span className={isLightPage ? "text-slate-500" : "text-white/60"}>PM</span>
              </span>
            </div>
          </Link>

          {/* Desktop nav links */}
          <nav className={`hidden md:flex items-center gap-1 text-sm font-medium ${isLightPage ? "text-slate-600" : "text-white/80"}`}>
            {mobileMenuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg transition-all ${isLightPage ? "hover:bg-slate-100 hover:text-slate-900" : "hover:bg-white/10 hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={`md:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-all touch-manipulation ${hamburgerBg}`}
            >
              <span className="sr-only">{mobileOpen ? "Close" : "Menu"}</span>
              <div className="flex flex-col gap-[5px] w-4">
                <span className={`block h-[1.5px] rounded-full transition-all duration-300 ${isLightPage ? "bg-slate-700" : "bg-white"} ${mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
                <span className={`block h-[1.5px] rounded-full transition-all duration-300 ${isLightPage ? "bg-slate-700" : "bg-white"} ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
                <span className={`block h-[1.5px] rounded-full transition-all duration-300 ${isLightPage ? "bg-slate-700" : "bg-white"} ${mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
              </div>
            </button>

            {/* Client Portal */}
            <Link
              href="/auth/signin"
              className={`min-h-[40px] flex items-center px-4 py-2 rounded-xl border text-sm font-semibold transition-all touch-manipulation ${btnClass}`}
            >
              Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/20 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile slide-down menu */}
      <div
        className={`fixed top-0 left-0 right-0 z-[45] md:hidden transition-all duration-250 ease-out ${
          mobileOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
        style={{ paddingTop: "calc(60px + env(safe-area-inset-top, 0px))" }}
      >
        <div
          className={`mx-3 rounded-2xl overflow-hidden ${menuBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className="p-2">
            <p className={`text-[10px] font-semibold uppercase tracking-widest px-3 py-2 ${menuMuted}`}>
              Navigate
            </p>
            {mobileMenuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center min-h-[48px] px-3 py-2.5 rounded-xl text-[15px] font-medium transition-all touch-manipulation ${menuText} ${menuItemHover}`}
              >
                {link.label}
              </Link>
            ))}
            <div className={`border-t my-2 ${menuDivider}`} />
            <Link
              href="/auth/signin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between min-h-[48px] px-3 py-2.5 rounded-xl text-[15px] font-semibold transition-all touch-manipulation ${menuText} ${menuItemHover}`}
            >
              Client Portal
              <span className={`text-xs font-normal ${menuMuted}`}>→</span>
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
