import Link from "next/link";
import {
  landingFeatureItems,
  landingAdvantages,
  landingPainPoints,
  landingMigrationItems,
  landingIntegrationItems,
} from "@/components/landing/home/landing-content";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Why switch", href: "#why-switch" },
  { label: "Integrations", href: "#integrations" },
  { label: "Migration", href: "#migration" },
];

const features = landingFeatureItems.slice(0, 6);

export function SimpleLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white">
              SP
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              SmartStart PM
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/signin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/rentals"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              View rentals
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Built in Naples, Florida
              </span>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Modern property management,
                <span className="block text-indigo-600">without the bloat.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                Lighter software, quick UI, phone-friendly flows, and practical
                AI assistance. Per-property pricing, real migration support,
                and APIs that actually work.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/rentals"
                  className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 sm:w-auto"
                >
                  Browse rentals
                </Link>
                <Link
                  href="/contact"
                  className="w-full rounded-lg border border-slate-300 bg-white px-6 py-3 text-center text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 sm:w-auto"
                >
                  Talk to us
                </Link>
              </div>
              <p className="mt-6 text-sm text-slate-500">
                No monthly minimum &middot; Volume discounts &middot; Migration support
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Everything your team needs in one place
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Messaging, maintenance, applications, payments, and reporting,
                designed to be fast on every device.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="why-switch" className="border-b border-slate-200 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Why switch
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Legacy PM tools are showing their age
              </h2>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-8">
                <h3 className="text-lg font-semibold text-slate-900">
                  Common pain points
                </h3>
                <ul className="mt-5 space-y-3">
                  {landingPainPoints.slice(0, 6).map((p) => (
                    <li key={p} className="flex gap-3 text-sm text-slate-700">
                      <span className="mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-2.5 w-2.5"
                          aria-hidden="true"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-white p-8 shadow-sm ring-1 ring-indigo-100">
                <h3 className="text-lg font-semibold text-slate-900">
                  How we&rsquo;re different
                </h3>
                <ul className="mt-5 space-y-3">
                  {landingAdvantages.slice(0, 6).map((a) => (
                    <li key={a} className="flex gap-3 text-sm text-slate-700">
                      <span className="mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-2.5 w-2.5"
                          aria-hidden="true"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="integrations" className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Integrations
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Plays nicely with the tools you already use
              </h2>
              <p className="mt-4 text-base text-slate-600">
                APIs, webhooks, CSV imports, and migration help so less copy
                and paste, less waiting on a vendor.
              </p>
            </div>
            <div className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-3">
              {landingIntegrationItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                Pricing
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Simple per-property pricing
              </h2>
              <p className="mt-4 text-base text-slate-600">
                No monthly minimum. Volume discounts as your portfolio grows.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm font-medium text-slate-500">Starting at</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-slate-900">
                  $4
                  <span className="text-base font-medium text-slate-500">
                    {" "}
                    / property / month
                  </span>
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Discounts for portfolios over 50 units. Custom pricing for
                  enterprise and student housing.
                </p>
              </div>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "All features included",
                  "Unlimited users",
                  "API + webhook access",
                  "CSV migration assistance",
                  "Email & in-app support",
                  "Volume pricing tiers",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/contact"
                  className="rounded-lg bg-indigo-600 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  Get a quote
                </Link>
                <Link
                  href="/management"
                  className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                >
                  See product details
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="migration" className="border-b border-slate-200 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
                  Migration
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Move from your old PM platform without the headache
                </h2>
                <p className="mt-4 text-base text-slate-600">
                  Step-by-step moves from common platforms, with clear
                  milestones and real humans helping your team.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/contact"
                    className="rounded-lg bg-slate-900 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Plan my migration
                  </Link>
                </div>
              </div>
              <ul className="space-y-4">
                {landingMigrationItems.slice(0, 6).map((m, i) => (
                  <li
                    key={m}
                    className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-700">
                      {m}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 py-20 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to see it in action?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
              Browse real rentals on the platform, or talk to us about
              migrating your portfolio.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/rentals"
                className="w-full rounded-lg bg-white px-6 py-3 text-center text-base font-semibold text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto"
              >
                Browse rentals
              </Link>
              <Link
                href="/auth/signup"
                className="w-full rounded-lg border border-slate-700 bg-transparent px-6 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-slate-800 sm:w-auto"
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-semibold text-white">
                SP
              </span>
              <span className="text-sm font-semibold text-slate-900">
                SmartStart PM
              </span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link href="/rentals" className="text-sm text-slate-600 hover:text-slate-900">
                Rentals
              </Link>
              <Link href="/management" className="text-sm text-slate-600 hover:text-slate-900">
                Management
              </Link>
              <Link href="/properties" className="text-sm text-slate-600 hover:text-slate-900">
                Properties
              </Link>
              <Link href="/contact" className="text-sm text-slate-600 hover:text-slate-900">
                Contact
              </Link>
              <Link href="/auth/signin" className="text-sm text-slate-600 hover:text-slate-900">
                Sign in
              </Link>
            </nav>
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} SmartStart PM &middot; Naples, FL
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
