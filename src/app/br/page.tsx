"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeft,
  Banknote,
  Bot,
  Briefcase,
  Building2,
  CalendarRange,
  Check,
  CircleDollarSign,
  ContactRound,
  Cpu,
  Database,
  FileStack,
  LayoutDashboard,
  Layers,
  MessageSquareMore,
  Minus,
  Moon,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  Table2,
  UserCircle2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import styles from "./br-page.module.css";

const BR_THEME_KEY = "br-prefers-light";

type Level = "full" | "partial" | "limited" | "none";

const P = {
  lavender: { bg: "#ede9fe", fg: "#5b21b6" },
  mint: { bg: "#d1fae5", fg: "#047857" },
  sky: { bg: "#dbeafe", fg: "#1d4ed8" },
  peach: { bg: "#ffedd5", fg: "#c2410c" },
  rose: { bg: "#fce7f3", fg: "#be185d" },
  butter: { bg: "#fef9c3", fg: "#a16207" },
  slate: { bg: "#e2e8f0", fg: "#334155" },
  cyan: { bg: "#cffafe", fg: "#0e7490" },
} as const;

function PastelIcon({
  palette,
  small,
  xs,
  children,
}: {
  palette: (typeof P)[keyof typeof P];
  small?: boolean;
  xs?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`${styles.pastelIcon} ${small ? styles.pastelIconSm : ""} ${xs ? styles.pastelIconXs : ""}`}
      style={{ background: palette.bg, color: palette.fg }}
    >
      {children}
    </span>
  );
}

const COLUMNS = [
  { key: "us" as const, label: "SmartStartPM", short: "Us", icon: Sparkles, palette: P.lavender },
  { key: "rent" as const, label: "Rent-only apps", short: "Rent", icon: Banknote, palette: P.mint },
  { key: "sheet" as const, label: "Sheets + email", short: "Manual", icon: Table2, palette: P.sky },
  { key: "legacy" as const, label: "Legacy PMS", short: "Legacy", icon: Building2, palette: P.peach },
  { key: "crm" as const, label: "Generic CRM", short: "CRM", icon: ContactRound, palette: P.rose },
];

const ROWS: {
  dim: string;
  rent: Level;
  sheet: Level;
  legacy: Level;
  crm: Level;
  icon: ComponentType<{ className?: string }>;
  palette: (typeof P)[keyof typeof P];
}[] = [
  {
    dim: "End-to-end ops (properties → leases → $ → maintenance)",
    rent: "limited",
    sheet: "none",
    legacy: "full",
    crm: "partial",
    icon: Layers,
    palette: P.lavender,
  },
  {
    dim: "Multi-role portals (tenant · owner · manager · admin)",
    rent: "limited",
    sheet: "none",
    legacy: "partial",
    crm: "partial",
    icon: Users,
    palette: P.sky,
  },
  {
    dim: "Maintenance tickets, emergency queues, vendor hooks",
    rent: "none",
    sheet: "limited",
    legacy: "full",
    crm: "limited",
    icon: Wrench,
    palette: P.peach,
  },
  {
    dim: "Invoices, pay rent, receipts, overdue & payment analytics",
    rent: "full",
    sheet: "limited",
    legacy: "full",
    crm: "limited",
    icon: CircleDollarSign,
    palette: P.mint,
  },
  {
    dim: "In-app messaging & announcements",
    rent: "limited",
    sheet: "limited",
    legacy: "partial",
    crm: "full",
    icon: MessageSquareMore,
    palette: P.cyan,
  },
  {
    dim: "Portfolio / unit calendars & date blocking",
    rent: "none",
    sheet: "limited",
    legacy: "partial",
    crm: "limited",
    icon: CalendarRange,
    palette: P.butter,
  },
  {
    dim: "Financial, occupancy & maintenance analytics",
    rent: "limited",
    sheet: "none",
    legacy: "partial",
    crm: "partial",
    icon: LayoutDashboard,
    palette: P.rose,
  },
  {
    dim: "AI assistant (Luna) — intent, FAQs, tenant support",
    rent: "none",
    sheet: "none",
    legacy: "limited",
    crm: "limited",
    icon: Bot,
    palette: P.lavender,
  },
  {
    dim: "Autonomous actions — guardrails, logs, vendor dispatch",
    rent: "none",
    sheet: "none",
    legacy: "limited",
    crm: "none",
    icon: Cpu,
    palette: P.sky,
  },
  {
    dim: "Compliance hub — obligations, eviction flow, FH checks, rent calc",
    rent: "none",
    sheet: "none",
    legacy: "limited",
    crm: "none",
    icon: Scale,
    palette: P.peach,
  },
  {
    dim: "Tenant intelligence & portfolio risk signals",
    rent: "none",
    sheet: "none",
    legacy: "limited",
    crm: "none",
    icon: ShieldCheck,
    palette: P.mint,
  },
  {
    dim: "Modern stack — Next.js, Auth.js, MongoDB, self-hostable",
    rent: "partial",
    sheet: "none",
    legacy: "limited",
    crm: "partial",
    icon: Database,
    palette: P.slate,
  },
  {
    dim: "i18n, branding API, PWA-minded UX, public rentals + Luna widget",
    rent: "partial",
    sheet: "none",
    legacy: "limited",
    crm: "partial",
    icon: Sparkles,
    palette: P.rose,
  },
];

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

const STACK_LAYERS = [
  { label: "Experience", title: "Dashboard + public rentals + Luna", icon: LayoutDashboard, palette: P.sky },
  { label: "Application", title: "Next.js App Router + APIs", icon: Layers, palette: P.lavender },
  { label: "Domain", title: "Leases · payments · maintenance · compliance", icon: Briefcase, palette: P.mint },
  { label: "Intelligence", title: "Luna assistant + autonomous actions", icon: Cpu, palette: P.rose },
  { label: "Data", title: "MongoDB · Auth.js · S3 · LLM (optional)", icon: Database, palette: P.peach },
] as const;

const PIPELINE = [
  { label: "Tenant portal", icon: UserCircle2, palette: P.sky },
  { label: "Manager ops", icon: Briefcase, palette: P.lavender },
  { label: "Luna AI", icon: Bot, palette: P.rose },
  { label: "Automation log", icon: FileStack, palette: P.butter },
  { label: "MongoDB", icon: Database, palette: P.mint },
] as const;

function levelIcon(level: Level) {
  const wrap = (node: ReactNode, palette: (typeof P)[keyof typeof P]) => (
    <PastelIcon palette={palette} xs>
      {node}
    </PastelIcon>
  );
  switch (level) {
    case "full":
      return wrap(<Check className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />, P.mint);
    case "partial":
      return wrap(<Minus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />, P.butter);
    case "limited":
      return wrap(<Minus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />, P.slate);
    default:
      return wrap(<X className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />, P.peach);
  }
}

function Cell({ level, us }: { level: Level; us?: boolean }) {
  if (us) {
    return (
      <div className={styles.cellUs}>
        <PastelIcon palette={P.mint} xs>
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </PastelIcon>
        <span className={styles.cellUsText}>Shipped in repo</span>
      </div>
    );
  }
  return (
    <div className={styles.cellOther}>
      {levelIcon(level)}
      <span className={styles.cellLabel}>
        {level === "full" && "Strong"}
        {level === "partial" && "Partial"}
        {level === "limited" && "Limited"}
        {level === "none" && "Rare / DIY"}
      </span>
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function ArchitectureDiagram({ light, motion }: { light: boolean; motion: boolean }) {
  const p = motion ? "" : ` ${styles.pathInstant}`;
  const box = light
    ? { fill: "rgba(255,255,255,0.97)", stroke: "rgba(15,23,42,0.09)", text: "#1e293b", sub: "#64748b" }
    : { fill: "rgba(30,41,59,0.94)", stroke: "rgba(148,163,184,0.22)", text: "#f1f5f9", sub: "#94a3b8" };
  const inner = light
    ? { fill: "rgba(248,250,252,0.99)", stroke: "rgba(99,102,241,0.2)", sub: "#fff", subStroke: "rgba(15,23,42,0.07)" }
    : { fill: "rgba(15,23,42,0.78)", stroke: "rgba(129,140,248,0.28)", sub: "rgba(45,55,72,0.92)", subStroke: "rgba(148,163,184,0.2)" };
  const bandTitle = light ? "#64748b" : "#a8b3c9";
  const nodeText = light ? "#334155" : "#e2e8f0";
  const stepFill = light ? "#eef2ff" : "rgba(99,102,241,0.25)";
  const stepText = light ? "#4338ca" : "#c7d2fe";
  const cap = light ? "#94a3b8" : "#7c8aa0";

  const topY = 92;
  const boxH = 84;
  const midY = topY + boxH / 2;
  const boxes = [
    { x: 40, w: 172, step: "1", title: "Browser", line2: "Marketing · rentals · sign-in" },
    { x: 228, w: 188, step: "2", title: "Next.js shell", line2: "App Router · layouts · RSC" },
    { x: 440, w: 172, step: "3", title: "/api handlers", line2: "JSON · auth · uploads" },
    { x: 628, w: 232, step: "4", title: "Integrations", line2: "OAuth · S3 · email · LLM" },
  ] as const;
  const nextCx = boxes[1].x + boxes[1].w / 2;
  const domainTop = 242;
  const domainH = 168;
  const services = [
    { x: 52, t: "Leases" },
    { x: 192, t: "Payments" },
    { x: 332, t: "Maintenance" },
    { x: 472, t: "Messaging" },
    { x: 612, t: "Compliance" },
  ] as const;

  const h1 = `M ${boxes[0].x + boxes[0].w} ${midY} L ${boxes[1].x} ${midY}`;
  const h2 = `M ${boxes[1].x + boxes[1].w} ${midY} L ${boxes[2].x} ${midY}`;
  const h3 = `M ${boxes[2].x + boxes[2].w} ${midY} L ${boxes[3].x} ${midY}`;
  const v1 = `M ${nextCx} ${topY + boxH} L ${nextCx} ${domainTop}`;

  return (
    <svg
      className={styles.diagramSvg}
      viewBox="0 0 900 430"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Request flow from browser through Next.js and API routes into domain services and MongoDB"
    >
      <defs>
        <linearGradient id="brg-arch" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={light ? "#818cf8" : "#a5b4fc"} />
          <stop offset="100%" stopColor={light ? "#38bdf8" : "#7dd3fc"} />
        </linearGradient>
        <filter id="glow-arch">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <text x="450" y="36" textAnchor="middle" fill={bandTitle} fontSize="11" fontFamily="system-ui, sans-serif" letterSpacing="0.2em">
        ONE REQUEST · LEFT TO RIGHT
      </text>

      {boxes.map((b) => (
        <g key={b.step}>
          <rect
            x={b.x + b.w / 2 - 14}
            y={topY - 26}
            width="28"
            height="22"
            rx="8"
            fill={stepFill}
            stroke={box.stroke}
          />
          <text
            x={b.x + b.w / 2}
            y={topY - 11}
            textAnchor="middle"
            fill={stepText}
            fontSize="11"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            {b.step}
          </text>
          <rect x={b.x} y={topY} width={b.w} height={boxH} rx="18" fill={box.fill} stroke={box.stroke} />
          <text
            x={b.x + b.w / 2}
            y={topY + 34}
            textAnchor="middle"
            fill={box.text}
            fontSize="14"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {b.title}
          </text>
          <text
            x={b.x + b.w / 2}
            y={topY + 56}
            textAnchor="middle"
            fill={box.sub}
            fontSize="11"
            fontFamily="system-ui, sans-serif"
          >
            {b.line2}
          </text>
        </g>
      ))}

      {motion && (
        <>
          <path d={h1} stroke="url(#brg-arch)" strokeWidth="5" strokeLinecap="round" className={styles.pathEnergy} />
          <path d={h2} stroke="url(#brg-arch)" strokeWidth="5" strokeLinecap="round" className={`${styles.pathEnergy} ${styles.pathEnergy2}`} />
          <path d={h3} stroke="url(#brg-arch)" strokeWidth="5" strokeLinecap="round" className={`${styles.pathEnergy} ${styles.pathEnergy3}`} />
          <path d={v1} stroke="url(#brg-arch)" strokeWidth="5" strokeLinecap="round" className={styles.pathEnergyV} />
        </>
      )}

      <path className={`${styles.pathDraw}${p}`} d={h1} stroke="url(#brg-arch)" strokeWidth="2.5" strokeLinecap="round" />
      <path className={`${styles.pathDraw} ${styles.pathDraw2}${p}`} d={h2} stroke="url(#brg-arch)" strokeWidth="2.5" strokeLinecap="round" />
      <path className={`${styles.pathDraw} ${styles.pathDraw3}${p}`} d={h3} stroke="url(#brg-arch)" strokeWidth="2.5" strokeLinecap="round" />
      <path className={`${styles.pathDraw} ${styles.pathDraw4}${p}`} d={v1} stroke="url(#brg-arch)" strokeWidth="2.5" strokeLinecap="round" />

      {motion && (
        <>
          <circle r="4" fill={light ? "#818cf8" : "#c4b5fd"} opacity="0.95">
            <animateMotion dur="2.6s" repeatCount="indefinite" path={h1} />
          </circle>
          <circle r="3.5" fill={light ? "#38bdf8" : "#7dd3fc"} opacity="0.9">
            <animateMotion dur="2.6s" repeatCount="indefinite" path={h2} begin="0.35s" />
          </circle>
          <circle r="3.5" fill={light ? "#818cf8" : "#a5b4fc"} opacity="0.9">
            <animateMotion dur="2.6s" repeatCount="indefinite" path={h3} begin="0.7s" />
          </circle>
          <circle r="4" fill={light ? "#22d3ee" : "#67e8f9"} opacity="0.92">
            <animateMotion dur="2s" repeatCount="indefinite" path={v1} begin="0.2s" />
          </circle>
        </>
      )}

      <circle
        cx={nextCx}
        cy={topY + boxH + 10}
        r="7"
        fill={light ? "#38bdf8" : "#7dd3fc"}
        className={motion ? styles.nodePulse : undefined}
        filter="url(#glow-arch)"
      />

      <rect x="36" y={domainTop} width="828" height={domainH} rx="22" fill={inner.fill} stroke={inner.stroke} />
      <text
        x="450"
        y={domainTop + 30}
        textAnchor="middle"
        fill={bandTitle}
        fontSize="10"
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.18em"
      >
        DOMAIN LAYER · MONGODB + BUSINESS LOGIC
      </text>
      <text
        x="450"
        y={domainTop + 50}
        textAnchor="middle"
        fill={cap}
        fontSize="11"
        fontFamily="system-ui, sans-serif"
      >
        Route handlers call these modules — one database, many surfaces
      </text>

      {services.map((s, i) => (
        <g
          key={s.t}
          className={motion ? styles.nodePop : undefined}
          style={motion ? { animationDelay: `${1.85 + i * 0.12}s` } : undefined}
        >
          <rect
            x={s.x}
            y={domainTop + 68}
            width="124"
            height="46"
            rx="14"
            fill={inner.sub}
            stroke={inner.subStroke}
            className={motion ? styles.nodePulse : undefined}
            style={motion ? { animationDelay: `${i * 0.12}s` } : undefined}
          />
          <text
            x={s.x + 62}
            y={domainTop + 96}
            textAnchor="middle"
            fill={nodeText}
            fontSize="12"
            fontWeight="500"
            fontFamily="system-ui, sans-serif"
          >
            {s.t}
          </text>
        </g>
      ))}

      <text x="450" y="418" textAnchor="middle" fill={cap} fontSize="10" fontFamily="system-ui, sans-serif" opacity="0.85">
        Figure · simplified for stakeholders — matches this repo’s Next.js + Mongo layout
      </text>
    </svg>
  );
}

export default function BrPage() {
  const [light, setLight] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const diagramMotion = !reduceMotion;
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BR_THEME_KEY);
      if (stored === "1") setLight(true);
      if (stored === "0") setLight(false);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(BR_THEME_KEY, light ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [light]);

  return (
    <div className={`${styles.page} ${light ? styles.pageLight : ""}`}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft className="h-4 w-4 opacity-80" />
            Back to home
          </Link>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={() => setLight((v) => !v)}
            aria-pressed={light}
            aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
          >
            {light ? (
              <>
                <Moon className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
                Dark
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-amber-300" strokeWidth={1.75} />
                Light
              </>
            )}
          </button>
        </div>

        <p className={styles.eyebrow}>Business readiness · competitive matrix</p>
        <h1 className={styles.title}>Why teams pick SmartStartPM over the usual stack</h1>
        <p className={styles.subtitle}>
          One platform for portfolio, money, work orders, messaging, calendar, analytics, AI, and
          compliance-oriented workflows—compared fairly to common alternatives. Illustrative
          categories, not a vendor scorecard.
        </p>

        <div className={styles.heroGrid}>
          <div>
            <div className={styles.heroKicker}>
              <PastelIcon palette={P.lavender} small>
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              </PastelIcon>
              <span className={styles.heroKickerText}>Layer by layer</span>
            </div>
            <p className={styles.heroLead}>
              Each row is one slice of the platform—experience through data—so the full stack reads
              top to bottom without overlap.
            </p>
          </div>

          <div className={styles.stackColumnScene} aria-hidden>
            <div className={styles.heroOrb} />
            <div className={styles.stackColumn}>
              {STACK_LAYERS.map((layer, i) => {
                const Icon = layer.icon;
                return (
                  <div
                    key={layer.title}
                    className={styles.floatCardWrap}
                    data-layer={String(i + 1)}
                  >
                    <div className={styles.floatCardReveal}>
                      <div className={styles.floatCard}>
                        <div className={styles.cardRow}>
                          <PastelIcon palette={layer.palette} small>
                            <Icon className="h-4 w-4" strokeWidth={1.75} />
                          </PastelIcon>
                          <div>
                            <div className={styles.cardLabel}>{layer.label}</div>
                            <div className={styles.cardTitle}>{layer.title}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
            <div className={styles.diagramIntro}>
              <span className={styles.diagramKicker}>How traffic moves</span>
              <h3 className={styles.diagramTitle}>From the browser to your domain code in four beats</h3>
              <p className={styles.diagramExplain}>
                Read the diagram like a timeline: each box is a stop for an HTTP request. The lower band
                is where leases, payments, maintenance, and the rest of the product actually run—backed by
                MongoDB in this codebase.
              </p>
              <ul className={styles.diagramLegend}>
                <li>
                  <span className={styles.legendSwatch} style={{ background: "#a5b4fc" }} />
                  Edge / UI
                </li>
                <li>
                  <span className={styles.legendSwatch} style={{ background: "#7dd3fc" }} />
                  App &amp; API
                </li>
                <li>
                  <span className={styles.legendSwatch} style={{ background: "#94a3b8" }} />
                  Domain + DB
                </li>
              </ul>
            </div>

            <div className={styles.diagramCanvas}>
              <ArchitectureDiagram light={light} motion={diagramMotion} />
            </div>

            <p className={styles.diagramPipelineLabel}>Where you see it in the product</p>

            <div className={styles.pipeline}>
              {PIPELINE.map((p) => {
                const Icon = p.icon;
                return (
                  <span key={p.label} className={styles.pipelineNode}>
                    <PastelIcon palette={p.palette} xs>
                      <Icon className="h-3 w-3" strokeWidth={2} />
                    </PastelIcon>
                    {p.label}
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Capability matrix vs alternatives</h2>
          <p className={styles.sectionLead}>
            <strong>SmartStartPM</strong> column reflects what this repository implements. Other
            columns describe what is <em>typical</em> in each category (your mileage varies by vendor
            and configuration).
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Capability</th>
                  {COLUMNS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <th key={c.key} className={c.key === "us" ? styles.colUs : undefined}>
                        <span className={styles.thInner}>
                          <PastelIcon palette={c.palette} xs>
                            <Icon className="h-3 w-3" strokeWidth={2} />
                          </PastelIcon>
                          {c.label}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => {
                  const RIcon = row.icon;
                  return (
                    <tr key={row.dim}>
                      <td>
                        <div className={styles.dimCell}>
                          <PastelIcon palette={row.palette} xs>
                            <RIcon className="h-3 w-3" strokeWidth={2} />
                          </PastelIcon>
                          <span className={styles.dimText}>{row.dim}</span>
                        </div>
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <PastelIcon palette={P.mint} xs>
                <Check className="h-3 w-3" />
              </PastelIcon>
              Strong / native
            </span>
            <span className={styles.legendItem}>
              <PastelIcon palette={P.butter} xs>
                <Minus className="h-3 w-3" />
              </PastelIcon>
              Partial
            </span>
            <span className={styles.legendItem}>
              <PastelIcon palette={P.slate} xs>
                <Minus className="h-3 w-3" />
              </PastelIcon>
              Limited
            </span>
            <span className={styles.legendItem}>
              <PastelIcon palette={P.peach} xs>
                <X className="h-3 w-3" />
              </PastelIcon>
              Rare or DIY
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Relative strength (illustrative 1–5)</h2>
          <p className={styles.sectionLead}>
            Subjective composite by dimension—not empirical market data. Bars animate on load for
            quick scanning.
          </p>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Strength dimension</th>
                  {COLUMNS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <th key={c.key} className={c.key === "us" ? styles.colUs : undefined}>
                        <span className={styles.thInner}>
                          <PastelIcon palette={c.palette} xs>
                            <Icon className="h-3 w-3" strokeWidth={2} />
                          </PastelIcon>
                          {c.short}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {STRENGTH_ROWS.map((row, rowIdx) => (
                  <tr key={row.label}>
                    <td>
                      <span className={styles.dimText}>{row.label}</span>
                    </td>
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
                            <span className={styles.scoreNum}>{v}</span>
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
            <Sparkles className="h-4 w-4 opacity-90" strokeWidth={1.75} />
            Open demo sign-in
          </Link>
          <Link href="/rentals" className={`${styles.cta} ${styles.ctaGhost}`}>
            View public rentals
          </Link>
        </div>
        <p className={styles.footnote}>
          Long-form brief with Mermaid diagrams:{" "}
          <code className={styles.code}>docs/FEATURES_AND_COMPETITIVE_COMPARISON.md</code>
        </p>
      </div>
    </div>
  );
}
