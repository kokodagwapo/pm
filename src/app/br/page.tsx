"use client";

import Link from "next/link";
import { Check, Minus, X, ArrowLeft, Sparkles } from "lucide-react";
import styles from "./br-page.module.css";

type Level = "full" | "partial" | "limited" | "none";

const COLUMNS = [
  { key: "us", label: "SmartStartPM", short: "Us" },
  { key: "rent", label: "Rent-only apps", short: "Rent" },
  { key: "sheet", label: "Sheets + email", short: "Manual" },
  { key: "legacy", label: "Legacy PMS", short: "Legacy" },
  { key: "crm", label: "Generic CRM", short: "CRM" },
] as const;

const ROWS: { dim: string; rent: Level; sheet: Level; legacy: Level; crm: Level }[] = [
  {
    dim: "End-to-end ops (properties → leases → $ → maintenance)",
    rent: "limited",
    sheet: "none",
    legacy: "full",
    crm: "partial",
  },
  {
    dim: "Multi-role portals (tenant · owner · manager · admin)",
    rent: "limited",
    sheet: "none",
    legacy: "partial",
    crm: "partial",
  },
  {
    dim: "Maintenance tickets, emergency queues, vendor hooks",
    rent: "none",
    sheet: "limited",
    legacy: "full",
    crm: "limited",
  },
  {
    dim: "Invoices, pay rent, receipts, overdue & payment analytics",
    rent: "full",
    sheet: "limited",
    legacy: "full",
    crm: "limited",
  },
  {
    dim: "In-app messaging & announcements",
    rent: "limited",
    sheet: "limited",
    legacy: "partial",
    crm: "full",
  },
  {
    dim: "Portfolio / unit calendars & date blocking",
    rent: "none",
    sheet: "limited",
    legacy: "partial",
    crm: "limited",
  },
  {
    dim: "Financial, occupancy & maintenance analytics",
    rent: "limited",
    sheet: "none",
    legacy: "partial",
    crm: "partial",
  },
  {
    dim: "AI assistant (Luna) — intent, FAQs, tenant support",
    rent: "none",
    sheet: "none",
    legacy: "limited",
    crm: "limited",
  },
  {
    dim: "Autonomous actions — guardrails, logs, vendor dispatch",
    rent: "none",
    sheet: "none",
    legacy: "limited",
    crm: "none",
  },
  {
    dim: "Compliance hub — obligations, eviction flow, FH checks, rent calc",
    rent: "none",
    sheet: "none",
    legacy: "limited",
    crm: "none",
  },
  {
    dim: "Tenant intelligence & portfolio risk signals",
    rent: "none",
    sheet: "none",
    legacy: "limited",
    crm: "none",
  },
  {
    dim: "Modern stack — Next.js, Auth.js, MongoDB, self-hostable",
    rent: "partial",
    sheet: "none",
    legacy: "limited",
    crm: "partial",
  },
  {
    dim: "i18n, branding API, PWA-minded UX, public rentals + Luna widget",
    rent: "partial",
    sheet: "none",
    legacy: "limited",
    crm: "partial",
  },
];

/** 1–5 illustrative composite scores by column (not market data). */
const STRENGTH_ROWS: { label: string; values: Record<(typeof COLUMNS)[number]["key"], number> }[] = [
  {
    label: "Operational breadth (portfolio → money → work → comms)",
    values: { us: 5, rent: 2, sheet: 1, legacy: 4, crm: 3 },
  },
  {
    label: "AI assistant + autonomous / agentic automation",
    values: { us: 5, rent: 1, sheet: 1, legacy: 2, crm: 2 },
  },
  {
    label: "Compliance-adjacent workflows (tooling + records)",
    values: { us: 4, rent: 1, sheet: 1, legacy: 2, crm: 1 },
  },
  {
    label: "Modern extensibility (APIs, self-host, current stack)",
    values: { us: 5, rent: 3, sheet: 2, legacy: 2, crm: 4 },
  },
];

function levelIcon(level: Level) {
  switch (level) {
    case "full":
      return <Check className="h-4 w-4 text-emerald-400 shrink-0" aria-label="Strong" />;
    case "partial":
      return <Minus className="h-4 w-4 text-amber-400/90 shrink-0" aria-label="Partial" />;
    case "limited":
      return <Minus className="h-4 w-4 text-slate-400 shrink-0" aria-label="Limited" />;
    default:
      return <X className="h-4 w-4 text-slate-600 shrink-0" aria-label="Not typical" />;
  }
}

function Cell({ level, us }: { level: Level; us?: boolean }) {
  if (us) {
    return (
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-cyan-300 shrink-0" aria-hidden />
        <span className="text-slate-100 font-medium text-[0.8125rem]">Shipped in repo</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-slate-400">
      {levelIcon(level)}
      <span className="text-[0.8125rem]">
        {level === "full" && "Strong"}
        {level === "partial" && "Partial"}
        {level === "limited" && "Limited"}
        {level === "none" && "Rare / DIY"}
      </span>
    </div>
  );
}

const STACK_LAYERS = [
  { label: "Experience", title: "Dashboard + public rentals + Luna" },
  { label: "Application", title: "Next.js App Router + APIs" },
  { label: "Domain", title: "Leases · payments · maintenance · compliance" },
  { label: "Intelligence", title: "Luna assistant + autonomous actions" },
  { label: "Data", title: "MongoDB · Auth.js · S3 · LLM (optional)" },
];

export default function BrPage() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <p className={styles.eyebrow}>Business readiness · competitive matrix</p>
        <h1 className={styles.title}>Why teams pick SmartStartPM over the usual stack</h1>
        <p className={styles.subtitle}>
          One platform for portfolio, money, work orders, messaging, calendar, analytics, AI, and
          compliance-oriented workflows—compared fairly to common alternatives. Illustrative
          categories, not a vendor scorecard.
        </p>

        <div className={styles.heroGrid}>
          <div>
            <div className="flex items-center gap-2 text-indigo-300 mb-3">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold tracking-widest uppercase">Exploded stack</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed font-light">
              3D view of how layers sit together: experience, app shell, domain services,
              intelligence, and data—what “full-stack property ops” means in this codebase.
            </p>
          </div>

          <div className={styles.scene} aria-hidden>
            <div className={styles.heroOrb} />
            <div className={styles.stack}>
              {STACK_LAYERS.map((layer) => (
                <div key={layer.title} className={styles.floatCard}>
                  <div className={styles.cardLabel}>{layer.label}</div>
                  <div className={styles.cardTitle}>{layer.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Live architecture sketch</h2>
          <p className={styles.sectionLead}>
            Animated paths show traffic from browsers into Next.js routes, domain modules, and
            integrations—same mental model as the docs, tuned for a quick stakeholder read.
          </p>

          <div className={styles.diagramWrap}>
            <svg
              className={styles.diagramSvg}
              viewBox="0 0 800 360"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="Architecture: clients to Next.js to services to data"
            >
              <defs>
                <linearGradient id="brg1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect x="40" y="40" width="140" height="72" rx="16" fill="rgba(30,41,59,0.9)" stroke="rgba(148,163,184,0.35)" />
              <text x="110" y="78" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="system-ui">
                Public + auth clients
              </text>

              <rect x="240" y="40" width="160" height="72" rx="16" fill="rgba(30,41,59,0.9)" stroke="rgba(99,102,241,0.45)" />
              <text x="320" y="78" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="system-ui">
                Next.js App Router
              </text>

              <rect x="460" y="40" width="140" height="72" rx="16" fill="rgba(30,41,59,0.9)" stroke="rgba(34,211,238,0.35)" />
              <text x="530" y="78" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="system-ui">
                /api route handlers
              </text>

              <rect x="640" y="40" width="120" height="72" rx="16" fill="rgba(30,41,59,0.9)" stroke="rgba(148,163,184,0.35)" />
              <text x="700" y="78" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontFamily="system-ui">
                OAuth · S3 · LLM
              </text>

              <path
                className={styles.pathDraw}
                d="M 180 76 L 240 76"
                stroke="url(#brg1)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                className={`${styles.pathDraw} ${styles.pathDraw2}`}
                d="M 400 76 L 460 76"
                stroke="url(#brg1)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                className={`${styles.pathDraw} ${styles.pathDraw3}`}
                d="M 600 76 L 640 76"
                stroke="url(#brg1)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              <rect x="120" y="160" width="560" height="140" rx="20" fill="rgba(15,23,42,0.65)" stroke="rgba(99,102,241,0.2)" />
              <text x="400" y="192" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="system-ui" letterSpacing="0.14em">
                DOMAIN SERVICES (MONGODB-BACKED)
              </text>

              {[
                { x: 150, t: "Leases & docs" },
                { x: 275, t: "Payments" },
                { x: 385, t: "Maintenance" },
                { x: 510, t: "Messaging" },
                { x: 615, t: "Compliance" },
              ].map((b, i) => (
                <g key={b.t}>
                  <rect
                    x={b.x}
                    y="210"
                    width="105"
                    height="44"
                    rx="12"
                    fill="rgba(51,65,85,0.85)"
                    stroke="rgba(148,163,184,0.25)"
                    className={styles.nodePulse}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                  <text x={b.x + 52} y="237" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="system-ui">
                    {b.t}
                  </text>
                </g>
              ))}

              <path
                className={styles.pathDraw}
                d="M 400 112 L 400 160"
                stroke="url(#brg1)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              <circle cx="400" cy="130" r="6" fill="#22d3ee" className={styles.nodePulse} filter="url(#glow)" />
            </svg>

            <div className={styles.pipeline}>
              {["Tenant portal", "Manager ops", "Luna AI", "Automation log", "MongoDB"].map((t) => (
                <span key={t} className={styles.pipelineNode}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Capability matrix vs alternatives</h2>
          <p className={styles.sectionLead}>
            <strong className="text-slate-200">SmartStartPM</strong> column reflects what this
            repository implements. Other columns describe what is <em>typical</em> in each category
            (your mileage varies by vendor and configuration).
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Capability</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={c.key === "us" ? styles.colUs : undefined}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.dim}>
                    <td className="text-slate-200 font-normal max-w-[220px]">{row.dim}</td>
                    <td className={styles.colUs}>
                      <Cell level="full" us />
                    </td>
                    <td>
                      <Cell level={row.rent} />
                    </td>
                    <td>
                      <Cell level={row.sheet} />
                    </td>
                    <td>
                      <Cell level={row.legacy} />
                    </td>
                    <td>
                      <Cell level={row.crm} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.legend}>
            <span>
              <span className={styles.dot} style={{ background: "#34d399" }} />
              Strong / native
            </span>
            <span>
              <span className={styles.dot} style={{ background: "#fbbf24" }} />
              Partial
            </span>
            <span>
              <span className={styles.dot} style={{ background: "#64748b" }} />
              Limited
            </span>
            <span>
              <span className={styles.dot} style={{ background: "#334155" }} />
              Rare or DIY
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Relative strength (illustrative 1–5)</h2>
          <p className={styles.sectionLead}>
            Subjective composite by dimension—not empirical market data. Bars use a quick scale
            animation for at-a-glance positioning.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Strength dimension</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className={c.key === "us" ? styles.colUs : undefined}>
                      {c.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STRENGTH_ROWS.map((row, rowIdx) => (
                  <tr key={row.label}>
                    <td className="text-slate-200 font-normal max-w-[14rem]">{row.label}</td>
                    {COLUMNS.map((c, colIdx) => {
                      const v = row.values[c.key];
                      const isUs = c.key === "us";
                      return (
                        <td key={c.key} className={c.key === "us" ? styles.colUs : undefined}>
                          <div className="flex items-center gap-2">
                            <div className={styles.barTrack}>
                              <div
                                className={`${styles.barFill} ${!isUs ? styles.barMuted : ""}`}
                                style={{
                                  width: `${v * 20}%`,
                                  animationDelay: `${(rowIdx + colIdx) * 0.07}s`,
                                }}
                              />
                            </div>
                            <span className="text-slate-500 text-xs w-4 tabular-nums">{v}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className={styles.ctaRow}>
          <Link href="/auth/signin?demo=1" className={`${styles.cta} ${styles.ctaPrimary}`}>
            Open demo sign-in
          </Link>
          <Link href="/rentals" className={`${styles.cta} ${styles.ctaGhost}`}>
            View public rentals
          </Link>
        </div>
        <p className="text-xs text-slate-600 mt-4 max-w-xl">
          Long-form brief with Mermaid diagrams:{" "}
          <code className="text-slate-500">docs/FEATURES_AND_COMPETITIVE_COMPARISON.md</code> in the
          repository.
        </p>
      </div>
    </div>
  );
}
