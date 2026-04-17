import { Check, Tag } from "lucide-react";
import { landingPricingRows } from "@/components/landing/home/landing-content";

function PricingCompareRow({
  label,
  smartstart,
  legacy,
}: {
  label: string;
  smartstart: boolean;
  legacy: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-slate-200 py-3 last:border-b-0">
      <span className="text-sm leading-relaxed text-slate-700">{label}</span>
      <span className="flex w-10 justify-center">
        {smartstart ? <Check className="h-4 w-4 text-emerald-600" /> : <span className="text-slate-300">·</span>}
      </span>
      <span className="flex w-10 justify-center">
        {legacy ? <Check className="h-4 w-4 text-slate-400" /> : <span className="text-slate-300">·</span>}
      </span>
    </div>
  );
}

export function LandingHomePricing() {
  return (
    <section id="pricing" className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Tag className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Pricing
          </p>
          <h2 className="mt-4 text-balance font-[var(--font-playfair)] text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl">
            Straightforward pricing that grows with your portfolio
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            One clear structure. No monthly minimum. Ask us about volume pricing.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm sm:p-8">
            <div className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-900">
              SmartStart PM
            </div>
            <h3 className="mt-5 font-[var(--font-playfair)] text-3xl font-normal tracking-tight text-slate-950">
              $1.25
            </h3>
            <p className="mt-1 text-sm font-medium text-slate-700">
              per property / month
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-emerald-900/90">
              No minimum. Volume discounts for larger portfolios.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
              No hidden costs. We stay lean, keep overhead low, and do not bury the
              real bill in add-ons or fine print.
            </p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Cost pressure</span>
                <span className="text-emerald-700">Lower</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-[22%] rounded-full bg-gradient-to-r from-emerald-500 to-sky-400" />
              </div>
            </div>

            <ul className="mt-8 space-y-3">
              {[
                "No monthly floor. Start at your current size.",
                "Better per door rates as you add units.",
                "Custom setup and integrations without endless change orders.",
                "Help with migration and CSV imports right up front.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="font-[var(--font-playfair)] text-2xl font-normal tracking-tight text-slate-950">
              AppFolio · Buildium · RentManager
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              Typical range from major competitors. Pricing varies by add-ons and integrations.
            </p>
            <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
              $2.50 to $6+
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              per property / month (typical)
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
              $250 to $500+ monthly minimums are common before add-ons, and API access,
              custom workflows, extra seats, or integrations often cost more.
            </p>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Cost pressure</span>
                <span className="text-slate-600">Higher</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-slate-400 to-slate-500" />
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Comparison</span>
                <span className="w-10 text-center">SS</span>
                <span className="w-10 text-center">Legacy</span>
              </div>
              <div className="px-4 py-1">
                {landingPricingRows.map((row) => (
                  <PricingCompareRow key={row.label} {...row} />
                ))}
              </div>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-slate-500">
              The table shows the gap, not a binding quote. Fair pricing follows one
              conversation about your portfolio, integrations, and where you run the app.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
