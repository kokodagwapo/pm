"use client";

import Link from "next/link";

const navLinks = [
  { href: "/rentals", label: "Rentals" },
  { href: "/rentals?type=sale", label: "Sales" },
  { href: "/management", label: "Management" },
  { href: "/contact", label: "Contact" },
];

export function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo + UGC icon */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center ring-2 ring-white/30 group-hover:ring-white/50 transition-all">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
            </svg>
          </div>
          <span className="font-[var(--font-montserrat)] font-semibold text-white text-lg tracking-wide">
            SmartStartPM
          </span>
        </Link>

        {/* Center nav - pill-shaped */}
        <nav className="hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-full text-white/90 hover:text-white hover:bg-white/20 transition-all text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile nav - simplified */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/rentals"
            className="px-3 py-2 rounded-full text-white/90 text-sm"
          >
            Rentals
          </Link>
          <Link
            href="/contact"
            className="px-3 py-2 rounded-full text-white/90 text-sm"
          >
            Contact
          </Link>
        </div>

        {/* Client Portal */}
        <Link
          href="/auth/signin"
          className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/90 hover:text-white hover:bg-white/20 transition-all text-sm font-medium"
        >
          Client Portal
        </Link>
      </div>
    </header>
  );
}
