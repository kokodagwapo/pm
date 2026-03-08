"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sun,
  Umbrella,
  Globe,
  Phone,
  ExternalLink,
  Play,
  X,
  MapPin,
  Maximize2,
} from "lucide-react";

/* ─── Modal ─────────────────────────────────────────────────────────────── */
interface ModalItem {
  title: string;
  url: string;
  type: "website" | "video";
  description?: string;
}

function LinkModal({ item, onClose }: { item: ModalItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "rgba(0,0,0,0.92)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="text-white font-semibold text-sm truncate">{item.title}</p>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
        >
          <X className="w-4 h-4" /> Close
        </button>
      </div>

      {/* Body */}
      {item.type === "video" ? (
        <iframe
          src={item.url}
          className="flex-1 w-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={item.title}
        />
      ) : (
        /* Website portal — opens in new tab; most sites block iframes */
        <div className="flex-1 flex items-center justify-center p-6"
          style={{ background: "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)" }}
        >
          <div className="max-w-lg w-full text-center space-y-6">
            {/* Icon */}
            <div className="w-24 h-24 rounded-3xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center mx-auto shadow-2xl shadow-sky-500/10">
              <Globe className="w-12 h-12 text-sky-400" />
            </div>
            {/* Title */}
            <div>
              <h2
                className="text-3xl text-white mb-3 leading-tight"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontWeight: 300 }}
              >
                {item.title}
              </h2>
              {item.description && (
                <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
              )}
            </div>
            {/* CTA */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-base transition-all duration-200 shadow-2xl shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-105"
              style={{ background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
            >
              <ExternalLink className="w-5 h-5" />
              Visit Official Website
            </a>
            <p className="text-slate-500 text-xs">Opens in a new tab</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Link buttons ───────────────────────────────────────────────────────── */
function LinkButtons({
  url, videoUrl, name, description, onOpen,
}: {
  url?: string; videoUrl?: string; name: string; description?: string;
  onOpen: (item: ModalItem) => void;
}) {
  if (!url && !videoUrl) return null;
  return (
    <div className="flex gap-2 mt-3 flex-wrap">
      {url && (
        <button
          onClick={() => onOpen({ title: name, url, type: "website", description })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-500 hover:text-sky-600 border border-slate-200 hover:border-sky-200 text-[11px] font-semibold uppercase tracking-wide transition-all"
        >
          <Globe className="w-3 h-3" /> Website
        </button>
      )}
      {videoUrl && (
        <button
          onClick={() => onOpen({ title: name, url: videoUrl, type: "video" })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 border border-rose-100 hover:border-rose-200 text-[11px] font-semibold uppercase tracking-wide transition-all"
        >
          <Play className="w-3 h-3 fill-current" /> Watch
        </button>
      )}
    </div>
  );
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const faqs = [
  { q: "What's the check-in and check-out time?", a: "Standard check-in is after 4:00 PM and check-out is by 11:00 AM. Early check-in or late check-out may be available — just let us know your arrival time when you book." },
  { q: "Is parking available?", a: "Yes, each unit includes dedicated parking. Additional street or guest parking is available nearby. Contact us for specifics on your unit." },
  { q: "Are pets allowed?", a: "Pet policies vary by unit. Some properties welcome pets with a deposit. Check the property listing or contact us before booking." },
  { q: "What's included in the rent?", a: "Most units include water, trash, and community amenities (pool, fitness center). Electricity, internet, and cable are typically the resident's responsibility." },
  { q: "Is WiFi reliable for remote work?", a: "Naples has excellent high-speed coverage from Xfinity, Spectrum, and AT&T. Most properties are wired for gigabit service. Confirm your preferred provider at your unit." },
  { q: "How do I set up utilities before moving in?", a: "Contact Florida Power & Light (FPL) for electricity and your internet provider 2–3 weeks before move-in. Water/sewer are often handled through City of Naples or Collier County Utilities." },
  { q: "What's hurricane season like?", a: "June through November — peak August–October. Naples has a well-coordinated emergency system. Get renter's insurance covering storm damage and sign up for Collier County emergency alerts." },
  { q: "Is there public transportation?", a: "Naples is primarily car-dependent. Collier Area Transit (CAT) runs limited bus routes; Uber/Lyft are widely available. RSW Airport is ~35 miles north in Fort Myers." },
  { q: "Are beach chairs/towels provided?", a: "Depends on the property — check the amenities list. Lowdermilk Park and several resort beaches also offer chair and umbrella rentals on-site." },
  { q: "What's the cancellation policy?", a: "Cancellation terms depend on your booking type and dates — all details are shown before confirming. Contact us directly for flexible options." },
];

const attractions = [
  {
    cat: "Beaches", emoji: "🏖️", color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-100",
    items: [
      { name: "Vanderbilt Beach", note: "Wide shore, lifeguards, family-friendly — free access", url: "https://www.colliercountyfl.gov/parks/vanderbilt-beach" },
      { name: "Lowdermilk Park", note: "Volleyball, playground, ADA beach access & rentals", url: "https://www.naplesgov.com/parks-recreation/page/lowdermilk-park" },
      { name: "Delnor-Wiggins Pass", note: "Florida's top-rated beach — shelling, kayaking, snorkeling", url: "https://www.floridastateparks.org/parks-and-trails/delnor-wiggins-pass-state-park", videoUrl: "https://www.youtube.com/embed/XNsJGkSdFLI" },
      { name: "Clam Pass Park", note: "Scenic mangrove boardwalk + trolley ride to the shore", url: "https://www.colliercountyfl.gov/parks/clam-pass-park" },
    ],
  },
  {
    cat: "Nature & Wildlife", emoji: "🌿", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100",
    items: [
      { name: "Naples Botanical Garden", note: "170 acres of world-class themed gardens & trails", url: "https://www.naplesgarden.org", videoUrl: "https://www.youtube.com/embed/eLQ91TixLHY" },
      { name: "Corkscrew Swamp Sanctuary", note: "500-year-old cypress forest — 2.25-mile boardwalk walk", url: "https://corkscrew.audubon.org", videoUrl: "https://www.youtube.com/embed/M0P1BXKFYSA" },
      { name: "Naples Zoo", note: "70+ species, Primate Expedition Cruise, historic garden setting", url: "https://www.napleszoo.org" },
      { name: "Conservancy of SW Florida", note: "Aquarium, wildlife rehab, boat tours & walking trails", url: "https://conservancy.org" },
      { name: "Everglades Excursions", note: "Airboat rides, Ten Thousand Islands & wildlife tours nearby", url: "https://www.evergladesadventuretours.com", videoUrl: "https://www.youtube.com/embed/gQ2fBCa_WzE" },
    ],
  },
  {
    cat: "Water Activities", emoji: "⛵", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-100",
    items: [
      { name: "Pure Florida Boat Tours", note: "Eco tours, sunset cruises, jet ski & pontoon rentals", url: "https://www.pureflorida.com" },
      { name: "Naples Princess Cruises", note: "Elegant yacht lunch, sightseeing & dinner cruises", url: "https://naplesprincesscruises.com" },
      { name: "Parasailing & Paddleboarding", note: "Gulf views, mangrove kayaking, SUP at multiple beaches", url: "https://www.napleskayaktours.com" },
      { name: "Dolphin & Shelling Tours", note: "Sand Dollar Boat Tours to pristine Keewaydin Island", url: "https://www.visitsanddollarisland.com" },
    ],
  },
  {
    cat: "Culture & Dining", emoji: "🍽️", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100",
    items: [
      { name: "Fifth Avenue South", note: "Upscale dining, galleries, boutiques & nightlife", url: "https://www.fifthavesouth.com" },
      { name: "Third Street South", note: "Historic charm with chic cafes and local shops", url: "https://thirdstreetsouth.com" },
      { name: "Tin City Waterfront", note: "1920s oyster docks turned vibrant marketplace & seafood", url: "https://www.tincitynaples.com" },
      { name: "Artis-Naples", note: "Naples Philharmonic, Baker Museum & performing arts", url: "https://artisnaples.org" },
    ],
  },
  {
    cat: "Shopping & Golf", emoji: "⛳", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-100",
    items: [
      { name: "Waterside Shops", note: "Open-air luxury mall with top designer brands", url: "https://www.watersideshops.com" },
      { name: "Mercato", note: "Dining, entertainment, seasonal events & boutiques", url: "https://www.mercato.com" },
      { name: "Championship Golf", note: "80+ world-class courses — the Golf Capital of Florida", url: "https://www.visitnaplesfl.com/golf/" },
      { name: "Naples Trolley Tours", note: "Hop-on/hop-off, 17 stops, 100+ points of interest", url: "https://www.naplestrolleytours.com" },
    ],
  },
];

const weather = [
  { m: "Jan", hi: 75, lo: 54, rain: "Low",  icon: "☀️",  tip: "Peak season — mild, dry & sunny" },
  { m: "Feb", hi: 77, lo: 57, rain: "Low",  icon: "☀️",  tip: "Comfortable, low humidity" },
  { m: "Mar", hi: 80, lo: 60, rain: "Low",  icon: "🌤️", tip: "Great spring weather" },
  { m: "Apr", hi: 85, lo: 64, rain: "Low",  icon: "🌤️", tip: "Gardens in bloom, ideal" },
  { m: "May", hi: 89, lo: 70, rain: "Med",  icon: "⛅",  tip: "Most sunshine hours" },
  { m: "Jun", hi: 90, lo: 74, rain: "High", icon: "🌧️", tip: "Wet season begins" },
  { m: "Jul", hi: 91, lo: 75, rain: "High", icon: "⛈️", tip: "Daily afternoon thunderstorms" },
  { m: "Aug", hi: 91, lo: 75, rain: "High", icon: "⛈️", tip: "Hottest & wettest month" },
  { m: "Sep", hi: 90, lo: 74, rain: "High", icon: "🌩️", tip: "Hurricane season peak" },
  { m: "Oct", hi: 86, lo: 69, rain: "Med",  icon: "⛅",  tip: "Cooling down, fewer storms" },
  { m: "Nov", hi: 80, lo: 63, rain: "Low",  icon: "🌤️", tip: "Driest month — a gem" },
  { m: "Dec", hi: 76, lo: 56, rain: "Low",  icon: "☀️",  tip: "Winter season, pleasant" },
];

const parks = [
  { name: "Sugden Regional Park", desc: "60-acre freshwater lake, swimming beach, paddleboats & kayaking", tag: "Lake & Rec", tagColor: "bg-sky-50 text-sky-700 border-sky-100", url: "https://www.colliercountyfl.gov/parks/sugden-regional-park" },
  { name: "Cocohatchee River Park", desc: "135 acres — fishing, boat launch, nature trails, wildlife viewing", tag: "Nature", tagColor: "bg-emerald-50 text-emerald-700 border-emerald-100", url: "https://www.colliercountyfl.gov/parks/cocohatchee-river-park" },
  { name: "Freedom Park", desc: "50-acre urban preserve with lake, boardwalks & wildlife habitat", tag: "Trails", tagColor: "bg-green-50 text-green-700 border-green-100", url: "https://www.colliercountyfl.gov/parks/freedom-park" },
  { name: "North Collier Regional Park", desc: "213 acres — sports fields, walking trails & 2.5-mile track", tag: "Sports", tagColor: "bg-amber-50 text-amber-700 border-amber-100", url: "https://www.colliercountyfl.gov/parks/north-collier-regional-park" },
  { name: "Naples Botanical Garden", desc: "World-class garden, orchid collection, café & gift shop", tag: "Garden", tagColor: "bg-rose-50 text-rose-700 border-rose-100", url: "https://www.naplesgarden.org", videoUrl: "https://www.youtube.com/embed/eLQ91TixLHY" },
  { name: "Barefoot Beach Preserve", desc: "Undeveloped barrier island — 342 acres, nature trail & birding", tag: "Preserve", tagColor: "bg-teal-50 text-teal-700 border-teal-100", url: "https://www.colliercountyfl.gov/parks/barefoot-beach-preserve-county-park" },
];

const govServices = [
  { label: "City of Naples", desc: "Utility billing, permits, beach passes, parking, business tax", url: "https://www.naplesgov.com", phone: "(239) 213-1000", emoji: "🏛️" },
  { label: "Collier County Parks", desc: "County-wide parks, nature preserves, resident beach permits", url: "https://www.colliercountyfl.gov/parks", phone: "", emoji: "🌳" },
  { label: "Florida Power & Light (FPL)", desc: "Primary electricity provider — start service 2–3 weeks early", url: "https://www.fpl.com", phone: "(800) 375-2434", emoji: "⚡" },
  { label: "Collier County Tax Collector", desc: "FL driver's license, vehicle registration, voter registration", url: "https://www.colliertaxcollector.com", phone: "(239) 252-8171", emoji: "🪪" },
  { label: "Naples Police (Non-Emergency)", desc: "Dial 911 for emergencies. Non-emergency line listed below.", url: "", phone: "(239) 213-4844", emoji: "🚔" },
  { label: "Visit Naples (Tourism)", desc: "Official tourism guide, events calendar & local tips", url: "https://www.visitnaplesfl.com", phone: "", emoji: "📍" },
];

const tools = [
  { emoji: "🚗", iconBg: "bg-slate-100", label: "Getting Around", desc: "Naples is car-dependent. RSW Airport (Fort Myers) is ~35 mi north. Uber & Lyft are widely available.", url: "" },
  { emoji: "⚡", iconBg: "bg-amber-50", label: "Electricity (FPL)", desc: "Set up Florida Power & Light 2–3 weeks before move-in at fpl.com. Mention your move-in date for same-day activation.", url: "https://www.fpl.com" },
  { emoji: "📶", iconBg: "bg-sky-50", label: "Internet & Cable", desc: "Xfinity, Spectrum, and AT&T all serve Naples. Schedule your install before you arrive for a seamless move.", url: "https://www.xfinity.com" },
  { emoji: "🪪", iconBg: "bg-violet-50", label: "FL Driver's License", desc: "Update within 30 days of establishing residency at the Collier County Tax Collector's office.", url: "https://www.colliertaxcollector.com" },
  { emoji: "🌀", iconBg: "bg-emerald-50", label: "Hurricane Prep", desc: "Get renter's insurance covering storm damage. Sign up for free Collier County emergency alerts.", url: "https://www.colliercountyfl.gov/emergency-management" },
  { emoji: "✅", iconBg: "bg-rose-50", label: "Move-In Checklist", desc: "Forward USPS mail, update banks & IRS address, transfer medical records, enroll kids in Collier County Public Schools.", url: "" },
];

const rainBadge: Record<string, string> = {
  Low:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Med:  "bg-amber-50  text-amber-700  border border-amber-200",
  High: "bg-rose-50   text-rose-700   border border-rose-200",
};

/* ─── Section heading ─────────────────────────────────────────────────────── */
interface SectionHeadingProps { emoji: string; label: string; sub?: string; }
function SectionHeading({ emoji, label, sub }: SectionHeadingProps) {
  return (
    <div className="flex items-start gap-4 mb-7">
      <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 text-2xl leading-none shadow-sm">
        {emoji}
      </div>
      <div>
        <h2 className="text-xl md:text-2xl font-light text-slate-900 tracking-tight leading-tight"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          {label}
        </h2>
        {sub && <p className="text-sm text-slate-500 mt-1 font-normal leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-slate-100">
      {faqs.map((item, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 py-4 text-left group"
          >
            <span className="text-[15px] font-medium text-slate-800 group-hover:text-slate-900 leading-snug pr-2 flex-1">
              {item.q}
            </span>
            <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${open === i ? "bg-violet-600 text-white rotate-180" : "bg-slate-100 text-slate-400"}`}>
              <ChevronDown className="w-4 h-4" />
            </span>
          </button>
          {open === i && (
            <p className="text-sm text-slate-600 leading-[1.8] pb-5 pr-12">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────────────── */
export function NaplesAreaGuide() {
  const [modal, setModal] = useState<ModalItem | null>(null);
  const openModal  = useCallback((item: ModalItem) => setModal(item), []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <>
      <LinkModal item={modal} onClose={closeModal} />

      <div className="mt-10 space-y-12"
        style={{ fontFamily: "var(--font-jakarta), var(--font-inter), system-ui, sans-serif" }}
      >

        {/* ── FAQ ── */}
        <section>
          <SectionHeading emoji="💬" label="Frequently Asked Questions"
            sub="Everything you need to know before booking or moving in" />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 md:px-7 pb-2">
              <FAQ />
            </div>
          </div>
        </section>

        {/* ── Places to See ── */}
        <section>
          <SectionHeading emoji="📍" label="Places to See in Naples"
            sub="World-class beaches, nature, culture & cuisine — all within reach" />
          <div className="space-y-4">
            {attractions.map((cat) => (
              <div key={cat.cat} className={`rounded-2xl border ${cat.border} ${cat.bg} p-5 md:p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg leading-none">{cat.emoji}</span>
                  <h3 className={`font-bold text-xs uppercase tracking-widest ${cat.color}`}>{cat.cat}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.items.map((item) => (
                    <div key={item.name}
                      className="bg-white/80 rounded-xl p-4 border border-white hover:shadow-md transition-shadow"
                    >
                      <p className="font-semibold text-slate-800 text-[15px] leading-snug">{item.name}</p>
                      <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{item.note}</p>
                      <LinkButtons url={item.url} videoUrl={(item as any).videoUrl} name={item.name} description={item.note} onOpen={openModal} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Weather ── */}
        <section>
          <SectionHeading emoji="🌤️" label="Naples Weather Guide"
            sub="Subtropical climate — plan your stay around the seasons" />

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              <Sun className="w-3.5 h-3.5" /> Best season: Nov – Apr
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium">
              Gulf water avg 77 °F year-round
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
              <Umbrella className="w-3.5 h-3.5" /> Hurricane season: Jun – Nov
            </span>
          </div>

          {/* Mobile grid */}
          <div className="sm:hidden grid grid-cols-2 gap-2">
            {weather.map((w) => (
              <div key={w.m} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl leading-none">{w.icon}</span>
                  <span className="font-bold text-slate-800 text-sm">{w.m}</span>
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rainBadge[w.rain]}`}>{w.rain}</span>
                </div>
                <p className="text-slate-700 text-sm font-semibold">{w.hi}° <span className="text-slate-400 font-normal">/ {w.lo}°</span></p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{w.tip}</p>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Month</th>
                  <th className="text-center px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Hi °F</th>
                  <th className="text-center px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Lo °F</th>
                  <th className="text-center px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Rain</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {weather.map((w) => (
                  <tr key={w.m} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-800">{w.m}</span>
                      <span className="ml-2 text-base">{w.icon}</span>
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold text-slate-700">{w.hi}°</td>
                    <td className="px-3 py-3.5 text-center text-slate-400">{w.lo}°</td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${rainBadge[w.rain]}`}>{w.rain}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-[13px]">{w.tip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Parks ── */}
        <section>
          <SectionHeading emoji="🌳" label="Parks & Nature"
            sub="200+ parks, preserves, and green spaces across Collier County" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {parks.map((p) => (
              <div key={p.name}
                className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-emerald-200 hover:shadow-lg transition-all group"
              >
                <span className={`inline-block text-[10px] font-bold uppercase tracking-widest border px-2.5 py-1 rounded-full mb-3 ${p.tagColor}`}>
                  {p.tag}
                </span>
                <h3 className="font-semibold text-slate-800 text-[15px] leading-snug mb-2 group-hover:text-emerald-700 transition-colors">
                  {p.name}
                </h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{p.desc}</p>
                <LinkButtons url={p.url} videoUrl={(p as any).videoUrl} name={p.name} description={p.desc} onOpen={openModal} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Government Services ── */}
        <section>
          <SectionHeading emoji="🏛️" label="Government & Local Services"
            sub="Key contacts for residents and new arrivals in Collier County" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {govServices.map((s) => (
              <div key={s.label} className="flex gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-xl leading-none border border-blue-100">
                  {s.emoji}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-[15px] leading-snug">{s.label}</p>
                  <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {s.phone && (
                      <a href={`tel:${s.phone.replace(/\D/g, "")}`}
                        className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-slate-900 font-medium transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> {s.phone}
                      </a>
                    )}
                    {s.url && (
                      <button
                        onClick={() => openModal({ title: s.label, url: s.url, type: "website", description: s.desc })}
                        className="inline-flex items-center gap-1.5 text-[13px] text-sky-600 hover:text-sky-800 font-medium transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5" /> View Website
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Before You Arrive ── */}
        <section>
          <SectionHeading emoji="🧭" label="Before You Arrive"
            sub="Useful tools and checklists for a smooth move to Naples, FL" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((t) => (
              <div key={t.label}
                className="rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-lg transition-all group"
              >
                <div className={`w-11 h-11 rounded-2xl ${t.iconBg} flex items-center justify-center mb-4 text-2xl leading-none shadow-sm`}>
                  {t.emoji}
                </div>
                <h3 className="font-semibold text-slate-800 text-[15px] mb-2 group-hover:text-slate-900">{t.label}</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed">{t.desc}</p>
                {t.url && <LinkButtons url={t.url} name={t.label} description={t.desc} onOpen={openModal} />}
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
