import { Bell, Bot, CalendarOff, Calculator, ClipboardList, CreditCard, FileText, Gauge, MessageCircle, ShieldCheck, UserSearch, Wrench } from "lucide-react";
import { landingFeatureItems, landingPainPoints, landingAdvantages } from "@/components/landing/home/landing-content";

const featureIcons = [
  Bot,
  MessageCircle,
  Wrench,
  CalendarOff,
  ClipboardList,
  ShieldCheck,
  UserSearch,
  Gauge,
  CreditCard,
  Calculator,
  FileText,
  Bell,
];

export function LandingHomeFeatures() {
  return (
    <>
      <section id="features" className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              At a glance
            </p>
            <h2 className="mt-4 text-balance font-[var(--font-playfair)] text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl">
              Everything your portfolio runs on, from messaging to screening
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              AI-assisted messaging, direct tenant threads, maintenance requests,
              owner-side calendar blocking, applications, verification, screening,
              payment visibility, tax-ready reporting, and alerts so your team stops
              juggling a dozen different tools.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Tenant screening, credit, and identity capabilities depend on your region,
              policies, and enabled integrations. SmartStart connects the workflow while
              providers remain responsible for compliance.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {landingFeatureItems.map((item, index) => {
              const Icon = featureIcons[index % featureIcons.length];
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="why" className="border-b border-slate-200/80 bg-slate-50/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              Why teams switch
            </p>
            <h2 className="mt-4 text-balance font-[var(--font-playfair)] text-4xl font-normal tracking-tight text-slate-950 sm:text-5xl">
              Many older tools cost too much and still slow people down every day.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              The usual problem is not one missing feature. It is heavy software,
              scattered data, slow onboarding, and endless add-ons that make every
              process feel harder than it should.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                What we hear
              </p>
              <ul className="mt-4 space-y-3">
                {landingPainPoints.map((item) => (
                  <li key={item} className="border-l-2 border-slate-200 pl-4 text-[15px] leading-relaxed text-slate-600">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                What we focus on
              </p>
              <ul className="mt-4 space-y-3">
                {landingAdvantages.map((item) => (
                  <li key={item} className="border-l-2 border-emerald-200 pl-4 text-[15px] leading-relaxed text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
