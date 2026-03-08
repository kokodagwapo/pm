"use client";

import { useState } from "react";
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
} from "lucide-react";

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
    icon: Waves,
    color: "text-sky-500",
    bg: "bg-sky-50",
    border: "border-sky-100",
    items: [
      { name: "Vanderbilt Beach", note: "Wide shores, lifeguards, family-friendly — free access" },
      { name: "Lowdermilk Park", note: "Volleyball, playground, ADA beach access & rentals" },
      { name: "Delnor-Wiggins Pass", note: "Florida's top-rated beach — shelling, kayaking, snorkeling" },
      { name: "Clam Pass Park", note: "Scenic mangrove boardwalk + trolley ride to the shore" },
    ],
  },
  {
    cat: "Nature & Wildlife",
    icon: Leaf,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    items: [
      { name: "Naples Botanical Garden", note: "170 acres of world-class themed gardens and trails" },
      { name: "Corkscrew Swamp Sanctuary", note: "500-year-old cypress forest — 2.25 mi boardwalk" },
      { name: "Naples Zoo at Caribbean Gardens", note: "70+ species, Primate Expedition Cruise, historic setting" },
      { name: "Conservancy of SW Florida", note: "Aquarium, wildlife rehab, boat tours, walking trails" },
      { name: "Everglades Excursions", note: "Airboat rides, Ten Thousand Islands & wildlife tours" },
    ],
  },
  {
    cat: "Water Activities",
    icon: Anchor,
    color: "text-violet-500",
    bg: "bg-violet-50",
    border: "border-violet-100",
    items: [
      { name: "Pure Florida Boat Tours", note: "Eco tours, sunset cruises, jet ski rentals" },
      { name: "Naples Princess Cruises", note: "Elegant yacht tours — lunch, sightseeing & dinner" },
      { name: "Parasailing & Paddleboarding", note: "Gulf views, mangrove kayaking, SUP at multiple beaches" },
      { name: "Dolphin & Shelling Tours", note: "Sand Dollar Boat Tours to Keewaydin Island" },
    ],
  },
  {
    cat: "Culture & Dining",
    icon: UtensilsCrossed,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
    items: [
      { name: "Fifth Avenue South", note: "Upscale dining, art galleries, boutiques & nightlife" },
      { name: "Third Street South", note: "Historic charm with chic cafes and local shops" },
      { name: "Tin City Waterfront", note: "1920s oyster docks turned vibrant marketplace & seafood" },
      { name: "Artis-Naples", note: "Naples Philharmonic, Baker Museum & performing arts" },
    ],
  },
  {
    cat: "Shopping & Golf",
    icon: ShoppingBag,
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-100",
    items: [
      { name: "Waterside Shops", note: "Open-air luxury mall with top designer brands" },
      { name: "Mercato", note: "Dining, entertainment, seasonal events & boutiques" },
      { name: "World-Class Golf", note: "80+ championship courses — the Golf Capital of Florida" },
      { name: "Naples Trolley Tours", note: "Hop-on/hop-off, 17 stops, 100+ points of interest" },
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
  { name: "Sugden Regional Park", desc: "60-acre freshwater lake, swimming beach, paddleboats & kayaking", tag: "Lake & Recreation" },
  { name: "Cocohatchee River Park", desc: "135 acres — fishing, boat launch, nature trails, wildlife viewing", tag: "Nature" },
  { name: "Freedom Park", desc: "50-acre urban preserve with lake, boardwalks & wildlife habitat", tag: "Trails" },
  { name: "North Collier Regional Park", desc: "213 acres of sports fields, walking trails & a 2.5-mile track", tag: "Sports" },
  { name: "Naples Botanical Garden", desc: "World-class garden, orchid collection, café & gift shop", tag: "Garden" },
  { name: "Barefoot Beach Preserve", desc: "Undeveloped barrier island — 342 acres, nature trail & birding", tag: "Preserve" },
];

const govServices = [
  { label: "City of Naples", desc: "Utility billing, permits, beach passes, parking, business tax", url: "https://www.naplesgov.com", phone: "(239) 213-1000" },
  { label: "Collier County Parks", desc: "County-wide parks, nature preserves, resident beach permits", url: "https://www.collierparks.com", phone: "" },
  { label: "Florida Power & Light", desc: "Primary electricity provider — start service 2–3 weeks early", url: "https://www.fpl.com", phone: "(800) 375-2434" },
  { label: "Collier County Tax Collector", desc: "FL driver's license, vehicle registration, voter registration", url: "https://www.colliertaxcollector.com", phone: "(239) 252-8171" },
  { label: "Emergency / Police Non-Emergency", desc: "Dial 911 for emergencies. Naples PD non-emergency line below", url: "", phone: "(239) 213-4844" },
  { label: "Visit Naples (Tourism)", desc: "Official tourism guide, events calendar & local tips", url: "https://www.visitnaplesfl.com", phone: "" },
];

const tools = [
  { icon: Car, color: "text-slate-600", bg: "bg-slate-100", label: "Getting Around", desc: "Naples is car-dependent. RSW Airport (Fort Myers) is 35 mi north. Uber & Lyft are widely available." },
  { icon: Zap, color: "text-amber-500", bg: "bg-amber-50", label: "Electricity (FPL)", desc: "Set up Florida Power & Light 2–3 weeks before move-in at fpl.com. Mention your move-in date for same-day activation." },
  { icon: Wifi, color: "text-sky-500", bg: "bg-sky-50", label: "Internet & Cable", desc: "Xfinity, Spectrum, and AT&T all serve Naples. Bundle options available. Schedule install before you arrive." },
  { icon: Building2, color: "text-violet-500", bg: "bg-violet-50", label: "FL Driver's License", desc: "Update your license within 30 days of establishing residency at the Collier County Tax Collector's office." },
  { icon: Globe, color: "text-emerald-500", bg: "bg-emerald-50", label: "Hurricane Prep", desc: "Get renter's insurance covering storm damage. Sign up for free Collier County emergency alerts at colliercountyfl.gov." },
  { icon: CheckCircle2, color: "text-rose-500", bg: "bg-rose-50", label: "Move-In Checklist", desc: "Forward USPS mail, update banks & IRS address, transfer medical records, enroll in Collier County Public Schools if needed." },
];

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
            <span className="text-sm md:text-base font-medium text-slate-800 group-hover:text-slate-900 leading-snug pr-2">
              {item.q}
            </span>
            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${open === i ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
              {open === i ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>
          {open === i && (
            <p className="text-sm text-slate-600 leading-relaxed pb-4 pr-10">
              {item.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionHeading({ icon: Icon, label, sub }: { icon: any; label: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
      </div>
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          {label}
        </h2>
        {sub && <p className="text-sm text-slate-500 mt-0.5 font-normal">{sub}</p>}
      </div>
    </div>
  );
}

export function NaplesAreaGuide() {
  return (
    <div className="mt-10 space-y-10">

      {/* FAQ */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 md:px-8 pt-7 pb-2">
          <SectionHeading icon={Info} label="Frequently Asked Questions" sub="Everything you need to know before booking" />
        </div>
        <div className="px-5 md:px-8 pb-6">
          <FAQ />
        </div>
      </section>

      {/* Places to See */}
      <section>
        <SectionHeading icon={MapPin} label="Places to See in Naples" sub="World-class beaches, nature, culture & cuisine — all within reach" />
        <div className="space-y-4">
          {attractions.map((cat) => (
            <div key={cat.cat} className={`rounded-2xl border ${cat.border} ${cat.bg} p-5 md:p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <cat.icon className={`w-5 h-5 ${cat.color}`} />
                <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">{cat.cat}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.items.map((item) => (
                  <div key={item.name} className="bg-white/80 rounded-xl p-3 border border-white">
                    <p className="font-semibold text-slate-800 text-sm leading-snug">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Weather Guide */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 md:px-8 pt-7 pb-2">
          <SectionHeading icon={CloudSun} label="Naples Weather Guide" sub="Subtropical climate — plan your stay around the seasons" />
          <div className="flex flex-wrap gap-2 mb-6">
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
        <div className="px-5 md:px-8 pb-7 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">Month</th>
                <th className="text-center pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-14">Hi °F</th>
                <th className="text-center pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-14">Lo °F</th>
                <th className="text-center pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-16">Rain</th>
                <th className="text-left pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {weather.map((w) => (
                <tr key={w.m} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold text-slate-800">{w.m}</span>
                    <span className="ml-2 text-base">{w.icon}</span>
                  </td>
                  <td className="py-2.5 text-center font-medium text-slate-700">{w.hi}°</td>
                  <td className="py-2.5 text-center text-slate-500">{w.lo}°</td>
                  <td className="py-2.5 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      w.rain === "Low" ? "bg-emerald-50 text-emerald-700" :
                      w.rain === "Med" ? "bg-amber-50 text-amber-700" :
                      "bg-rose-50 text-rose-700"
                    }`}>{w.rain}</span>
                  </td>
                  <td className="py-2.5 text-slate-500 text-xs">{w.tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Parks & Beaches */}
      <section>
        <SectionHeading icon={Trees} label="Parks & Nature" sub="Over 200 parks, preserves, and green spaces across Collier County" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {parks.map((p) => (
            <div key={p.name} className="rounded-2xl bg-white border border-slate-200 p-5 hover:border-emerald-200 hover:shadow-md transition-all">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full mb-3">
                {p.tag}
              </span>
              <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1">{p.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Government Services */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 md:px-8 pt-7 pb-5">
          <SectionHeading icon={Building2} label="Government & Local Services" sub="Key contacts for residents and new arrivals in Naples" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {govServices.map((s) => (
              <div key={s.label} className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Globe className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm leading-snug">{s.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {s.phone && (
                      <a href={`tel:${s.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium">
                        <Phone className="w-3 h-3" /> {s.phone}
                      </a>
                    )}
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-800 font-medium">
                        <ExternalLink className="w-3 h-3" /> Website
                      </a>
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
        <SectionHeading icon={CheckCircle2} label="Before You Arrive" sub="Useful tools and checklists for a smooth move to Naples" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((t) => (
            <div key={t.label} className="rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center mb-4`}>
                <t.icon className={`w-5 h-5 ${t.color}`} />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm mb-1.5">{t.label}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
