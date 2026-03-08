"use client";

import { useState, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Sun,
  Umbrella,
  Trees,
  Building2,
  Phone,
  Globe,
  Waves,
  Anchor,
  Leaf,
  ShoppingBag,
  UtensilsCrossed,
  Car,
  Wifi,
  Zap,
  CheckCircle2,
  CloudSun,
  Info,
  ExternalLink,
  Play,
  X,
  Maximize2,
} from "lucide-react";

interface ModalItem {
  title: string;
  url: string;
  type: "website" | "video";
}

function LinkModal({ item, onClose }: { item: ModalItem | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-5 py-3 bg-black/70 backdrop-blur-xl border-b border-white/10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="text-white font-semibold text-sm truncate">{item.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in new tab
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 relative" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={item.type === "video" ? item.url : item.url}
          className="absolute inset-0 w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={item.title}
          sandbox={item.type === "video" ? undefined : "allow-same-origin allow-scripts allow-popups allow-forms"}
        />
        {item.type === "website" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0">
            <div className="bg-slate-900/90 rounded-2xl p-8 text-center pointer-events-auto max-w-sm">
              <Globe className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">{item.title}</p>
              <p className="text-slate-400 text-sm mb-6">This site prevents embedding — open it directly instead.</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Official Website
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkButtons({
  url,
  videoUrl,
  name,
  onOpen,
}: {
  url?: string;
  videoUrl?: string;
  name: string;
  onOpen: (item: ModalItem) => void;
}) {
  return (
    <div className="flex gap-1.5 mt-2 flex-wrap">
      {url && (
        <button
          onClick={() => onOpen({ title: name, url, type: "website" })}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-500 hover:text-sky-600 border border-slate-200 hover:border-sky-200 text-[11px] font-medium transition-colors"
        >
          <Globe className="w-3 h-3" />
          Website
        </button>
      )}
      {videoUrl && (
        <button
          onClick={() => onOpen({ title: name, url: videoUrl, type: "video" })}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 border border-rose-100 hover:border-rose-200 text-[11px] font-medium transition-colors"
        >
          <Play className="w-3 h-3 fill-current" />
          Video
        </button>
      )}
    </div>
  );
}

const faqs = [
  {
    q: "What's the check-in and check-out time?",
    a: "Standard check-in is after 4:00 PM and check-out is by 11:00 AM. Early check-in or late check-out may be available upon request — just let us know your arrival time when you book.",
  },
  {
    q: "Is parking available?",
    a: "Yes, each unit includes dedicated parking. Additional street or guest parking is available nearby. Ask us for specific details about your unit's parking situation.",
  },
  {
    q: "Are pets allowed?",
    a: "Pet policies vary by unit. Some properties welcome furry friends with a pet deposit. Please check the property details or contact us directly to confirm before booking.",
  },
  {
    q: "What's included in the rent?",
    a: "Most units include water, trash, and access to community amenities such as the pool and fitness center. Electricity, internet, and cable are typically the resident's responsibility unless stated otherwise.",
  },
  {
    q: "Is the WiFi reliable for remote work?",
    a: "The Naples area has excellent high-speed internet coverage from Xfinity, Spectrum, and AT&T. Most properties are wired for gigabit service. We recommend confirming your preferred provider is available at your specific unit.",
  },
  {
    q: "How do I set up utilities before moving in?",
    a: "We recommend contacting Florida Power & Light (FPL) for electricity and your preferred internet provider 2–3 weeks before your move-in date. Water and sewer are often handled through the City of Naples or Collier County Utilities.",
  },
  {
    q: "What's the hurricane season like?",
    a: "Hurricane season runs June through November, with peak activity in August–October. Naples has a well-coordinated emergency response system. We recommend getting renter's insurance that covers storm damage and signing up for Collier County emergency alerts.",
  },
  {
    q: "Is there public transportation?",
    a: "Naples is primarily car-dependent. Collier Area Transit (CAT) runs limited bus routes, and Uber/Lyft are widely available. The nearest major airport is Southwest Florida International (RSW) in Fort Myers, about 35 miles north.",
  },
  {
    q: "Are beach chairs and towels provided?",
    a: "This varies by property — check the amenities list on the listing. Lowdermilk Park and several resort-adjacent beaches also offer chair and umbrella rentals on-site.",
  },
  {
    q: "What's the cancellation policy?",
    a: "Cancellation terms depend on your booking type and selected dates. All details are shown clearly before you confirm. Contact us directly if you need to discuss flexible options.",
  },
];

const attractions = [
  {
    cat: "Beaches",
    emoji: "🏖️",
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-100",
    iconBg: "bg-sky-100",
    items: [
      { name: "Vanderbilt Beach", note: "Wide shores, lifeguards, family-friendly — free access", url: "https://www.colliercountyfl.gov/parks/vanderbilt-beach", videoUrl: "https://www.youtube.com/embed/videoseries?list=PLNXb0UoSUx1gTAMsZFUJKe5xtQ6l_B9vH" },
      { name: "Lowdermilk Park", note: "Volleyball, playground, ADA beach access & rentals", url: "https://www.naplesgov.com/parks-recreation/page/lowdermilk-park", videoUrl: "" },
      { name: "Delnor-Wiggins Pass", note: "Florida's top-rated beach — shelling, kayaking, snorkeling", url: "https://www.floridastateparks.org/parks-and-trails/delnor-wiggins-pass-state-park", videoUrl: "https://www.youtube.com/embed/xyzDelnor" },
      { name: "Clam Pass Park", note: "Scenic mangrove boardwalk + trolley ride to the shore", url: "https://www.colliercountyfl.gov/parks/clam-pass-park", videoUrl: "" },
    ],
  },
  {
    cat: "Nature & Wildlife",
    emoji: "🌿",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    iconBg: "bg-emerald-100",
    items: [
      { name: "Naples Botanical Garden", note: "170 acres of world-class themed gardens and trails", url: "https://www.naplesgarden.org", videoUrl: "https://www.youtube.com/embed/eLQ91TixLHY" },
      { name: "Corkscrew Swamp Sanctuary", note: "500-year-old cypress forest — 2.25 mi boardwalk", url: "https://corkscrew.audubon.org", videoUrl: "https://www.youtube.com/embed/M0P1BXKFYSA" },
      { name: "Naples Zoo at Caribbean Gardens", note: "70+ species, Primate Expedition Cruise, historic setting", url: "https://www.napleszoo.org", videoUrl: "" },
      { name: "Conservancy of SW Florida", note: "Aquarium, wildlife rehab, boat tours, walking trails", url: "https://conservancy.org", videoUrl: "" },
      { name: "Everglades Excursions", note: "Airboat rides, Ten Thousand Islands & wildlife tours", url: "https://www.evergladesadventuretours.com", videoUrl: "https://www.youtube.com/embed/gQ2fBCa_WzE" },
    ],
  },
  {
    cat: "Water Activities",
    emoji: "⛵",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    iconBg: "bg-violet-100",
    items: [
      { name: "Pure Florida Boat Tours", note: "Eco tours, sunset cruises, jet ski rentals", url: "https://www.pureflorida.com", videoUrl: "" },
      { name: "Naples Princess Cruises", note: "Elegant yacht tours — lunch, sightseeing & dinner", url: "https://naplesprincesscruises.com", videoUrl: "" },
      { name: "Parasailing & Paddleboarding", note: "Gulf views, mangrove kayaking, SUP at multiple beaches", url: "https://www.napleskayaktours.com", videoUrl: "" },
      { name: "Dolphin & Shelling Tours", note: "Sand Dollar Boat Tours to Keewaydin Island", url: "https://www.visitsanddollarisland.com", videoUrl: "" },
    ],
  },
  {
    cat: "Culture & Dining",
    emoji: "🍽️",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    iconBg: "bg-amber-100",
    items: [
      { name: "Fifth Avenue South", note: "Upscale dining, art galleries, boutiques & nightlife", url: "https://www.fifthavesouth.com", videoUrl: "" },
      { name: "Third Street South", note: "Historic charm with chic cafes and local shops", url: "https://thirdstreetsouth.com", videoUrl: "" },
      { name: "Tin City Waterfront", note: "1920s oyster docks turned vibrant marketplace & seafood", url: "https://www.tincitynaples.com", videoUrl: "" },
      { name: "Artis-Naples", note: "Naples Philharmonic, Baker Museum & performing arts", url: "https://artisnaples.org", videoUrl: "" },
    ],
  },
  {
    cat: "Shopping & Golf",
    emoji: "⛳",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-100",
    iconBg: "bg-rose-100",
    items: [
      { name: "Waterside Shops", note: "Open-air luxury mall with top designer brands", url: "https://www.watersideshops.com", videoUrl: "" },
      { name: "Mercato", note: "Dining, entertainment, seasonal events & boutiques", url: "https://www.mercato.com", videoUrl: "" },
      { name: "World-Class Golf", note: "80+ championship courses — the Golf Capital of Florida", url: "https://www.visitnaplesfl.com/golf/", videoUrl: "" },
      { name: "Naples Trolley Tours", note: "Hop-on/hop-off, 17 stops, 100+ points of interest", url: "https://www.naplestrolleytours.com", videoUrl: "" },
    ],
  },
];

const weather = [
  { m: "Jan", hi: 75, lo: 54, rain: "Low", icon: "☀️", tip: "Peak season — mild, dry & sunny" },
  { m: "Feb", hi: 77, lo: 57, rain: "Low", icon: "☀️", tip: "Comfortable, low humidity" },
  { m: "Mar", hi: 80, lo: 60, rain: "Low", icon: "🌤️", tip: "Great spring weather" },
  { m: "Apr", hi: 85, lo: 64, rain: "Low", icon: "🌤️", tip: "Gardens in bloom, ideal" },
  { m: "May", hi: 89, lo: 70, rain: "Med", icon: "⛅", tip: "Most sunshine hours" },
  { m: "Jun", hi: 90, lo: 74, rain: "High", icon: "🌧️", tip: "Wet season begins" },
  { m: "Jul", hi: 91, lo: 75, rain: "High", icon: "⛈️", tip: "Daily thunderstorms" },
  { m: "Aug", hi: 91, lo: 75, rain: "High", icon: "⛈️", tip: "Hottest & wettest month" },
  { m: "Sep", hi: 90, lo: 74, rain: "High", icon: "🌩️", tip: "Hurricane season peak" },
  { m: "Oct", hi: 86, lo: 69, rain: "Med", icon: "⛅", tip: "Cooling down, fewer storms" },
  { m: "Nov", hi: 80, lo: 63, rain: "Low", icon: "🌤️", tip: "Driest month — gem" },
  { m: "Dec", hi: 76, lo: 56, rain: "Low", icon: "☀️", tip: "Winter season, pleasant" },
];

const parks = [
  { name: "Sugden Regional Park", desc: "60-acre freshwater lake, swimming beach, paddleboats & kayaking", tag: "Lake & Recreation", url: "https://www.colliercountyfl.gov/parks/sugden-regional-park", videoUrl: "" },
  { name: "Cocohatchee River Park", desc: "135 acres — fishing, boat launch, nature trails, wildlife viewing", tag: "Nature", url: "https://www.colliercountyfl.gov/parks/cocohatchee-river-park", videoUrl: "" },
  { name: "Freedom Park", desc: "50-acre urban preserve with lake, boardwalks & wildlife habitat", tag: "Trails", url: "https://www.colliercountyfl.gov/parks/freedom-park", videoUrl: "" },
  { name: "North Collier Regional Park", desc: "213 acres of sports fields, walking trails & a 2.5-mile track", tag: "Sports", url: "https://www.colliercountyfl.gov/parks/north-collier-regional-park", videoUrl: "" },
  { name: "Naples Botanical Garden", desc: "World-class garden, orchid collection, café & gift shop", tag: "Garden", url: "https://www.naplesgarden.org", videoUrl: "https://www.youtube.com/embed/eLQ91TixLHY" },
  { name: "Barefoot Beach Preserve", desc: "Undeveloped barrier island — 342 acres, nature trail & birding", tag: "Preserve", url: "https://www.colliercountyfl.gov/parks/barefoot-beach-preserve-county-park", videoUrl: "" },
];

const govServices = [
  { label: "City of Naples", desc: "Utility billing, permits, beach passes, parking, business tax", url: "https://www.naplesgov.com", phone: "(239) 213-1000" },
  { label: "Collier County Parks", desc: "County-wide parks, nature preserves, resident beach permits", url: "https://www.colliercountyfl.gov/parks", phone: "" },
  { label: "Florida Power & Light", desc: "Primary electricity provider — start service 2–3 weeks early", url: "https://www.fpl.com", phone: "(800) 375-2434" },
  { label: "Collier County Tax Collector", desc: "FL driver's license, vehicle registration, voter registration", url: "https://www.colliertaxcollector.com", phone: "(239) 252-8171" },
  { label: "Emergency / Police Non-Emergency", desc: "Dial 911 for emergencies. Naples PD non-emergency line below", url: "", phone: "(239) 213-4844" },
  { label: "Visit Naples (Tourism)", desc: "Official tourism guide, events calendar & local tips", url: "https://www.visitnaplesfl.com", phone: "" },
];

const tools = [
  { emoji: "🚗", iconBg: "bg-slate-100", label: "Getting Around", desc: "Naples is car-dependent. RSW Airport (Fort Myers) is 35 mi north. Uber & Lyft are widely available.", url: "" },
  { emoji: "⚡", iconBg: "bg-amber-50", label: "Electricity (FPL)", desc: "Set up Florida Power & Light 2–3 weeks before move-in at fpl.com. Mention your move-in date for same-day activation.", url: "https://www.fpl.com" },
  { emoji: "📶", iconBg: "bg-sky-50", label: "Internet & Cable", desc: "Xfinity, Spectrum, and AT&T all serve Naples. Bundle options available. Schedule install before you arrive.", url: "https://www.xfinity.com" },
  { emoji: "🪪", iconBg: "bg-violet-50", label: "FL Driver's License", desc: "Update your license within 30 days of establishing residency at the Collier County Tax Collector's office.", url: "https://www.colliertaxcollector.com" },
  { emoji: "🌀", iconBg: "bg-emerald-50", label: "Hurricane Prep", desc: "Get renter's insurance covering storm damage. Sign up for free Collier County emergency alerts at colliercountyfl.gov.", url: "https://www.colliercountyfl.gov/emergency-management" },
  { emoji: "✅", iconBg: "bg-rose-50", label: "Move-In Checklist", desc: "Forward USPS mail, update banks & IRS address, transfer medical records, enroll in Collier County Public Schools if needed.", url: "" },
];

const rainStyle: Record<string, string> = {
  Low: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  Med: "bg-amber-50 text-amber-700 border border-amber-100",
  High: "bg-rose-50 text-rose-700 border border-rose-100",
};

const SECTION_THEMES: Record<string, { bg: string; iconBg: string; iconColor: string; emoji: string }> = {
  faq:     { bg: "from-violet-50 to-purple-50", iconBg: "bg-violet-100", iconColor: "text-violet-600", emoji: "💬" },
  places:  { bg: "from-sky-50 to-cyan-50",      iconBg: "bg-sky-100",    iconColor: "text-sky-600",    emoji: "📍" },
  weather: { bg: "from-amber-50 to-yellow-50",  iconBg: "bg-amber-100",  iconColor: "text-amber-600",  emoji: "🌤️" },
  parks:   { bg: "from-emerald-50 to-green-50", iconBg: "bg-emerald-100",iconColor: "text-emerald-600",emoji: "🌳" },
  gov:     { bg: "from-blue-50 to-indigo-50",   iconBg: "bg-blue-100",   iconColor: "text-blue-600",   emoji: "🏛️" },
  before:  { bg: "from-rose-50 to-pink-50",     iconBg: "bg-rose-100",   iconColor: "text-rose-600",   emoji: "🧭" },
};

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
            <span className="text-[15px] md:text-base font-medium text-slate-800 group-hover:text-slate-900 leading-snug pr-2">
              {item.q}
            </span>
            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${open === i ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}>
              {open === i ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
          {open === i && (
            <p className="text-sm text-slate-600 leading-[1.75] pb-4 pr-10">{item.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ themeKey, label, sub }: { themeKey: keyof typeof SECTION_THEMES; label: string; sub?: string }) {
  const theme = SECTION_THEMES[themeKey];
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className={`w-10 h-10 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 mt-0.5 text-xl leading-none`}>
        {theme.emoji}
      </div>
      <div>
        <h2 className="text-xl md:text-2xl font-light text-slate-900 tracking-tight leading-tight" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          {label}
        </h2>
        {sub && <p className="text-sm text-slate-500 mt-1 font-normal leading-relaxed">{sub}</p>}
      </div>
    </div>
  );
}

export function NaplesAreaGuide() {
  const [modal, setModal] = useState<ModalItem | null>(null);

  const openModal = useCallback((item: ModalItem) => setModal(item), []);
  const closeModal = useCallback(() => setModal(null), []);

  return (
    <>
      <LinkModal item={modal} onClose={closeModal} />

      <div
        className="mt-10 space-y-10"
        style={{ fontFamily: "var(--font-jakarta), var(--font-inter), system-ui, sans-serif" }}
      >

        {/* FAQ */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className={`px-5 md:px-8 pt-7 pb-2 bg-gradient-to-r ${SECTION_THEMES.faq.bg}`}>
            <SectionHeading themeKey="faq" label="Frequently Asked Questions" sub="Everything you need to know before booking or moving in" />
          </div>
          <div className="px-5 md:px-8 pb-6">
            <FAQ />
          </div>
        </section>

        {/* Places to See */}
        <section>
          <SectionHeading themeKey="places" label="Places to See in Naples" sub="World-class beaches, nature, culture & cuisine — all within reach" />
          <div className="space-y-4">
            {attractions.map((cat) => (
              <div key={cat.cat} className={`rounded-2xl border ${cat.border} ${cat.bg} p-5 md:p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl leading-none">{cat.emoji}</span>
                  <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">{cat.cat}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.items.map((item) => (
                    <div key={item.name} className="bg-white/80 rounded-xl p-3.5 border border-white">
                      <p className="font-semibold text-slate-800 text-[15px] leading-snug">{item.name}</p>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.note}</p>
                      <LinkButtons url={item.url} videoUrl={item.videoUrl} name={item.name} onOpen={openModal} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Weather Guide */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className={`px-5 md:px-8 pt-7 pb-4 bg-gradient-to-r ${SECTION_THEMES.weather.bg}`}>
            <SectionHeading themeKey="weather" label="Naples Weather Guide" sub="Subtropical climate — plan your stay around the seasons" />
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-medium">
                <Sun className="w-3.5 h-3.5" /> Best: Nov – Apr
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                Gulf water avg 77°F year-round
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-medium">
                <Umbrella className="w-3.5 h-3.5" /> Hurricane season: Jun – Nov
              </span>
            </div>
          </div>

          {/* Mobile: card grid */}
          <div className="sm:hidden px-5 pb-6 grid grid-cols-2 gap-2">
            {weather.map((w) => (
              <div key={w.m} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl leading-none">{w.icon}</span>
                  <span className="font-semibold text-slate-800 text-sm">{w.m}</span>
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${rainStyle[w.rain]}`}>{w.rain}</span>
                </div>
                <p className="text-slate-700 text-sm font-medium">{w.hi}° / <span className="text-slate-400 font-normal">{w.lo}°</span></p>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">{w.tip}</p>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block px-5 md:px-8 pb-7 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">Month</th>
                  <th className="text-center pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">Hi °F</th>
                  <th className="text-center pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">Lo °F</th>
                  <th className="text-center pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">Rain</th>
                  <th className="text-left pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {weather.map((w) => (
                  <tr key={w.m} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pr-3">
                      <span className="font-semibold text-slate-800">{w.m}</span>
                      <span className="ml-2 text-base">{w.icon}</span>
                    </td>
                    <td className="py-3 text-center font-medium text-slate-700">{w.hi}°</td>
                    <td className="py-3 text-center text-slate-500">{w.lo}°</td>
                    <td className="py-3 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rainStyle[w.rain]}`}>{w.rain}</span>
                    </td>
                    <td className="py-3 text-slate-500 text-sm">{w.tip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Parks & Nature */}
        <section>
          <SectionHeading themeKey="parks" label="Parks & Nature" sub="Over 200 parks, preserves, and green spaces across Collier County" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {parks.map((p) => (
              <div key={p.name} className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 hover:border-emerald-200 hover:shadow-md transition-all">
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full mb-3">
                  {p.tag}
                </span>
                <h3 className="font-semibold text-slate-800 text-[15px] leading-snug mb-1.5">{p.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
                <LinkButtons url={p.url} videoUrl={p.videoUrl} name={p.name} onOpen={openModal} />
              </div>
            ))}
          </div>
        </section>

        {/* Government Services */}
        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className={`px-5 md:px-8 pt-7 pb-6 bg-gradient-to-r ${SECTION_THEMES.gov.bg}`}>
            <SectionHeading themeKey="gov" label="Government & Local Services" sub="Key contacts for residents and new arrivals in Naples" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {govServices.map((s) => (
                <div key={s.label} className="flex gap-3 p-4 rounded-xl bg-white/70 backdrop-blur border border-white">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5 text-base leading-none">
                    🏛️
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-[15px] leading-snug">{s.label}</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{s.desc}</p>
                    <div className="flex flex-wrap gap-3 mt-2.5">
                      {s.phone && (
                        <a href={`tel:${s.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                          <Phone className="w-3.5 h-3.5" /> {s.phone}
                        </a>
                      )}
                      {s.url && (
                        <button
                          onClick={() => openModal({ title: s.label, url: s.url, type: "website" })}
                          className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-800 font-medium transition-colors"
                        >
                          <Maximize2 className="w-3.5 h-3.5" /> View Website
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Before You Arrive */}
        <section>
          <SectionHeading themeKey="before" label="Before You Arrive" sub="Useful tools and checklists for a smooth move to Naples" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((t) => (
              <div key={t.label} className="rounded-2xl bg-white border border-slate-200 p-5 md:p-6 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl ${t.iconBg} flex items-center justify-center mb-4 text-xl leading-none`}>
                  {t.emoji}
                </div>
                <h3 className="font-semibold text-slate-800 text-[15px] mb-2">{t.label}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
                {t.url && (
                  <LinkButtons url={t.url} name={t.label} onOpen={openModal} />
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
