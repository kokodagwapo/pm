"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/rentals", label: "Rentals" },
  { href: "/rentals?type=sale", label: "Sales" },
  { href: "/management", label: "Management" },
  { href: "/contact", label: "Contact" },
];

export function LandingHeader() {
  const pathname = usePathname();
  // Default to light for properties/rentals; avoid hydration mismatch when pathname is undefined during SSR
  const isLightPage =
    !pathname ||
    pathname.startsWith("/rentals") ||
    pathname.startsWith("/properties");

  const textClass = isLightPage ? "text-slate-900" : "text-white";
  const textMutedClass = isLightPage ? "text-slate-600" : "text-white/90";
  const textHoverClass = isLightPage ? "hover:text-slate-900 hover:bg-slate-100" : "hover:text-white hover:bg-white/20";
  const logoBgClass = isLightPage ? "bg-slate-200 ring-slate-300" : "bg-white/20 ring-white/30";
  const logoHoverClass = isLightPage ? "group-hover:ring-slate-400" : "group-hover:ring-white/50";
  const btnClass = isLightPage
    ? "bg-slate-900 border-slate-800 text-white hover:bg-slate-800"
    : "bg-white/10 border-white/20 text-white/90 hover:text-white hover:bg-white/20";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 md:px-8 py-3 sm:py-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] sm:pt-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Logo + UGC icon */}
        <Link href="/" className={`flex items-center gap-1.5 sm:gap-2 group min-h-[44px] touch-manipulation ${textClass}`}>
          <div className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full backdrop-blur-md flex items-center justify-center ring-2 transition-all shrink-0 ${logoBgClass} ${logoHoverClass}`}>
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
            </svg>
          </div>
          <span className="font-[var(--font-montserrat)] font-semibold text-base sm:text-lg tracking-wide truncate">
            SmartStartPM
          </span>
        </Link>

        {/* Center nav - pill-shaped */}
        <nav className="hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-full ${textMutedClass} ${textHoverClass} transition-all text-sm font-medium`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav - simplified, touch-friendly */}
        <div className="flex md:hidden items-center gap-1.5">
          <Link
            href="/rentals"
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 rounded-full ${textMutedClass} ${textHoverClass} text-sm touch-manipulation`}
          >
            Rentals
          </Link>
          <Link
            href="/contact"
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 rounded-full ${textMutedClass} ${textHoverClass} text-sm touch-manipulation`}
          >
            Contact
          </Link>
        </div>

        {/* Client Portal - touch-friendly */}
        <Link
          href="/auth/signin"
          className={`min-h-[44px] flex items-center px-4 sm:px-5 py-2.5 rounded-full backdrop-blur-xl border ${btnClass} transition-all text-sm font-medium touch-manipulation`}
        >
          Client Portal
        </Link>
      </div>
    </header>
  );
}
