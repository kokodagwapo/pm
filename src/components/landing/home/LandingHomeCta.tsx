import Link from "next/link";

export function LandingHomeCta() {
  return (
    <>
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-8 shadow-[0_24px_80px_-30px_rgba(2,6,23,0.8)] sm:p-10 lg:p-12">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">
                One platform. Every conversation.
              </p>
              <h2 className="mt-4 text-balance font-[var(--font-playfair)] text-4xl font-normal tracking-tight sm:text-5xl">
                Managers, owners, and tenants on one system.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-white/72">
                Messages, rent, maintenance, migration support, and integrations without
                the pile of apps or lost threads. Live value in weeks when your data is ready.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth/signin?demo=1"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-50"
                >
                  Book a quick tour
                </Link>
                <Link
                  href="/rentals"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/16 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/14"
                >
                  View rentals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>SmartStart PM</span>
          <span>hi@smartstart.us</span>
        </div>
      </footer>
    </>
  );
}
