import { UserRole } from "@/types";
import { Property } from "@/models";
import { connectDBSafe } from "@/lib/mongodb";
import type { HeidiAccessRole } from "@/lib/ai/luna-tools";

function formatCurrency(amount?: number) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildUnitSummary(units: any[] = []) {
  if (!Array.isArray(units) || units.length === 0) return "no units listed";

  return units
    .slice(0, 2)
    .map((unit) => {
      const bits = [
        unit?.unitNumber ? `unit ${unit.unitNumber}` : "unit",
        typeof unit?.bedrooms === "number" ? `${unit.bedrooms}bd` : null,
        typeof unit?.bathrooms === "number" ? `${unit.bathrooms}ba` : null,
        typeof unit?.squareFootage === "number" ? `${unit.squareFootage} sqft` : null,
        typeof unit?.rentAmount === "number" ? `${formatCurrency(unit.rentAmount)}/mo` : null,
        unit?.status ? `status ${unit.status}` : null,
        unit?.parking?.included
          ? `${unit?.parking?.spaces || 0} parking ${unit?.parking?.type || "space"}`
          : null,
        unit?.balcony ? "balcony" : null,
        unit?.patio ? "patio" : null,
        unit?.garden ? "garden" : null,
        unit?.notes ? `notes: ${String(unit.notes).slice(0, 120)}` : null,
      ].filter(Boolean);

      return bits.join(" | ");
    })
    .join(" || ");
}

function summarizeAmenities(amenities: any[] = []) {
  if (!Array.isArray(amenities) || amenities.length === 0) return "no amenities listed";
  return amenities
    .map((amenity) => amenity?.name)
    .filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
    .slice(0, 10)
    .join(", ");
}

function summarizeHoaFields(fields: any[] = []) {
  if (!Array.isArray(fields) || fields.length === 0) return "no HOA fields listed";
  return fields
    .slice(0, 6)
    .map((field) => `${field?.key || "field"}: ${String(field?.value || "").slice(0, 80)}`)
    .join(" | ");
}

export const NAPLES_AREA_KNOWLEDGE = `
=== NAPLES, FL AREA GUIDE — MEMORIZE IN FULL ===

--- RENTALS PAGE: NEIGHBORHOODS AVAILABLE ---
Falling Waters | Winter Park | World Tennis Club | Glen Eagle | Moon Lake | Naples Park | Royal Arms | Villas of Whittenberg

--- PROPERTY TYPES ---
Condo | House | Townhouse

--- FREQUENTLY ASKED QUESTIONS ---
Q: What's the check-in and check-out time?
A: Check-in is after 4:00 PM. Check-out by 11:00 AM. Early check-in or late check-out may be available — advise guests to mention arrival time at booking.

Q: Is parking available?
A: Yes — each unit includes dedicated parking. Additional street/guest parking nearby. Contact us for unit specifics.

Q: Are pets allowed?
A: Varies by unit. Some properties allow pets with a deposit. Always confirm before booking.

Q: What's included in rent?
A: Most units include water, trash, and community amenities (pool, fitness center). Electricity, internet, and cable are typically the resident's responsibility.

Q: Is WiFi reliable for remote work?
A: Yes. Naples has excellent high-speed coverage: Xfinity, Spectrum, and AT&T. Most properties are wired for gigabit. Confirm preferred provider with unit.

Q: How do I set up utilities before moving in?
A: Contact Florida Power & Light (FPL) for electricity and your internet provider 2–3 weeks before move-in. Water/sewer handled through City of Naples or Collier County Utilities.

Q: What's hurricane season like?
A: June through November — peak August–October. Naples has a well-coordinated emergency system. Advise guests to get renter's insurance and sign up for Collier County emergency alerts.

Q: Is there public transportation?
A: Naples is primarily car-dependent. Collier Area Transit (CAT) runs limited bus routes. Uber/Lyft are widely available. RSW Airport is ~35 miles north in Fort Myers.

Q: Are beach chairs/towels provided?
A: Depends on property — check amenities list. Lowdermilk Park and several resort beaches offer chair and umbrella rentals on-site.

Q: What's the cancellation policy?
A: Terms depend on booking type and dates — shown before confirming. Contact us directly for flexible options.

--- PLACES TO SEE IN NAPLES ---

BEACHES:
- Vanderbilt Beach: Wide shore, lifeguards, family-friendly, free access. Collier County managed.
- Lowdermilk Park: Volleyball, playground, ADA beach access and rentals. City of Naples park.
- Delnor-Wiggins Pass: Florida's top-rated beach — shelling, kayaking, snorkeling. State Park.
- Clam Pass Park: Scenic mangrove boardwalk + trolley ride to the shore. Collier County.

NATURE & WILDLIFE:
- Naples Botanical Garden: 170 acres of world-class themed gardens and trails.
- Corkscrew Swamp Sanctuary: 500-year-old cypress forest — 2.25-mile boardwalk walk. Audubon.
- Naples Zoo: 70+ species, Primate Expedition Cruise, historic garden setting.
- Conservancy of SW Florida: Aquarium, wildlife rehab, boat tours and walking trails.
- Everglades Excursions: Airboat rides, Ten Thousand Islands and wildlife tours nearby.

WATER ACTIVITIES:
- Pure Florida Boat Tours: Eco tours, sunset cruises, jet ski and pontoon rentals.
- Naples Princess Cruises: Elegant yacht lunch, sightseeing and dinner cruises.
- Parasailing & Paddleboarding: Gulf views, mangrove kayaking, SUP at multiple beaches. Naples Kayak Tours.
- Dolphin & Shelling Tours: Sand Dollar Boat Tours to pristine Keewaydin Island.

CULTURE & DINING:
- Fifth Avenue South: Upscale dining, galleries, boutiques and nightlife. Naples' premier street.
- Third Street South: Historic charm with chic cafes and local shops.
- Tin City Waterfront: 1920s oyster docks turned vibrant marketplace and seafood destination.
- Artis-Naples: Naples Philharmonic, Baker Museum and performing arts center.

SHOPPING & GOLF:
- Waterside Shops: Open-air luxury mall with top designer brands.
- Mercato: Dining, entertainment, seasonal events and boutiques.
- Championship Golf: 80+ world-class courses — Naples is the Golf Capital of Florida.
- Naples Trolley Tours: Hop-on/hop-off, 17 stops, 100+ points of interest.

--- NAPLES WEATHER GUIDE (monthly) ---
Jan: Hi 75°F / Lo 54°F | Low rain | Peak season — mild, dry and sunny
Feb: Hi 77°F / Lo 57°F | Low rain | Comfortable, low humidity
Mar: Hi 80°F / Lo 60°F | Low rain | Great spring weather
Apr: Hi 85°F / Lo 64°F | Low rain | Gardens in bloom, ideal
May: Hi 89°F / Lo 70°F | Med rain | Most sunshine hours
Jun: Hi 90°F / Lo 74°F | High rain | Wet season begins
Jul: Hi 91°F / Lo 75°F | High rain | Daily afternoon thunderstorms
Aug: Hi 91°F / Lo 75°F | High rain | Hottest and wettest month
Sep: Hi 90°F / Lo 74°F | High rain | Hurricane season peak
Oct: Hi 86°F / Lo 69°F | Med rain | Cooling down, fewer storms
Nov: Hi 80°F / Lo 63°F | Low rain | Driest month — a gem
Dec: Hi 76°F / Lo 56°F | Low rain | Winter season, pleasant
Best season: November – April. Gulf water avg 77°F year-round. Hurricane season: June – November.

--- PARKS & NATURE ---
- Sugden Regional Park: 60-acre freshwater lake, swimming beach, paddleboats and kayaking.
- Cocohatchee River Park: 135 acres — fishing, boat launch, nature trails, wildlife viewing.
- Freedom Park: 50-acre urban preserve with lake, boardwalks and wildlife habitat.
- North Collier Regional Park: 213 acres — sports fields, walking trails and 2.5-mile track.
- Naples Botanical Garden: World-class garden, orchid collection, café and gift shop.
- Barefoot Beach Preserve: Undeveloped barrier island — 342 acres, nature trail and birding.
(200+ parks, preserves, and green spaces across Collier County.)

--- GOVERNMENT & LOCAL SERVICES ---
- City of Naples: Utility billing, permits, beach passes, parking, business tax. Phone: (239) 213-1000. naplesgov.com
- Collier County Parks: County-wide parks, nature preserves, resident beach permits. colliercountyfl.gov/parks
- Florida Power & Light (FPL): Primary electricity provider — start service 2–3 weeks early. Phone: (800) 375-2434. fpl.com
- Collier County Tax Collector: FL driver's license, vehicle registration, voter registration. Phone: (239) 252-8171. colliertaxcollector.com
- Naples Police (Non-Emergency): Dial 911 for emergencies. Non-emergency: (239) 213-4844.
- Visit Naples (Tourism): Official tourism guide, events calendar and local tips. visitnaplesfl.com

--- BEFORE YOU ARRIVE CHECKLIST ---
- Getting Around: Naples is car-dependent. RSW Airport (Fort Myers) is ~35 mi north. Uber and Lyft are widely available.
- Electricity (FPL): Set up Florida Power & Light 2–3 weeks before move-in at fpl.com. Mention move-in date for same-day activation.
- Internet & Cable: Xfinity, Spectrum, and AT&T all serve Naples. Schedule install before you arrive for a seamless move.
- FL Driver's License: Update within 30 days of establishing residency at the Collier County Tax Collector's office.
- Hurricane Prep: Get renter's insurance covering storm damage. Sign up for free Collier County emergency alerts. colliercountyfl.gov/emergency-management
- Move-In Checklist: Forward USPS mail, update banks and IRS address, transfer medical records, enroll kids in Collier County Public Schools.

=== END NAPLES AREA GUIDE ===
`.trim();

export function inferCurrentSection(currentPath?: string | null) {
  if (!currentPath) return "unknown";
  if (currentPath.startsWith("/rentals")) return "public rentals";
  if (currentPath.startsWith("/properties")) return "property details";
  if (currentPath.startsWith("/dashboard/calendar")) return "calendar";
  if (currentPath.startsWith("/dashboard")) return "authenticated dashboard";
  if (currentPath.startsWith("/auth")) return "authentication";
  return "public website";
}

async function buildPortfolioMemorySnapshot(role: HeidiAccessRole, userId?: string) {
  await connectDBSafe();

  const query: Record<string, unknown> = { deletedAt: null };

  if (role === "guest" || role === UserRole.TENANT) {
    query.status = "available";
  } else if (role === UserRole.OWNER && userId) {
    query.ownerId = userId;
  } else if (role === UserRole.MANAGER && userId) {
    query.managerId = userId;
  }

  const properties = await Property.find(query)
    .select("name status neighborhood address description amenities hoaCustomFields units")
    .sort({ name: 1 })
    .lean();

  const totalProperties = properties.length;
  const websiteVisibleCount = properties.length;
  const availableProperties = properties.filter((property: any) => property.status === "available").length;

  const neighborhoods = Array.from(
    new Set(
      properties
        .map((property: any) => property.neighborhood)
        .filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
    )
  ).sort();

  const propertyLines = properties.map((property: any) => {
    const address = property.address
      ? `${property.address.street}, ${property.address.city}, ${property.address.state} ${property.address.zipCode}`
      : "address unavailable";
    const descriptionSnippet = property.description
      ? String(property.description).replace(/\s+/g, " ").slice(0, 180)
      : "no description";

    return `- ${property.name} | ${address} | neighborhood: ${property.neighborhood || "n/a"} | property status: ${property.status || "n/a"} | description: ${descriptionSnippet} | amenities: ${summarizeAmenities(property.amenities)} | HOA: ${summarizeHoaFields(property.hoaCustomFields)} | ${buildUnitSummary(property.units)}`;
  });

  return `
Live portfolio snapshot from MongoDB:
- Public website rental count: ${websiteVisibleCount}
- Total non-deleted properties in database: ${totalProperties}
- Properties currently marked available: ${availableProperties}
- Known neighborhoods: ${neighborhoods.join(", ") || "n/a"}

Memorized property catalog:
${propertyLines.join("\n")}
  `.trim();
}

function getRoleLabel(accessRole: HeidiAccessRole) {
  if (accessRole === UserRole.TENANT) return "Authenticated tenant";
  if (accessRole === UserRole.OWNER) return "Authenticated owner";
  if (accessRole === UserRole.MANAGER) return "Property manager";
  if (accessRole === UserRole.ADMIN) return "Administrator";
  return "Public visitor";
}

function getRoleInstruction(accessRole: HeidiAccessRole) {
  if (accessRole === "guest") {
    return "You are in visitor mode. You may inspect all currently available listings and their safe property details using approved tools, but never imply account access or reveal secrets like WiFi passwords, door codes, owner financials, or private internal records.";
  }
  if (accessRole === UserRole.TENANT) {
    return "You may use tenant-safe account, booking, FAQ, property, calendar, and maintenance data only when the APIs permit it.";
  }
  if (accessRole === UserRole.OWNER) {
    return "You may use owner-safe property and calendar data scoped to owned properties plus approved internal tools.";
  }
  if (accessRole === UserRole.MANAGER) {
    return "You may use management-safe property, listing, FAQ, and calendar data scoped by the application's permission layer.";
  }
  return "You may use administrator-approved tools and internal data, but still never reveal restricted fields unless the API returns them for this session.";
}

export async function buildHeidiInstructions(options: {
  accessRole: HeidiAccessRole;
  userId?: string;
  currentPath?: string;
  currentSection?: string;
  pageTitle?: string;
  propertyContext?: string;
  mode?: "voice" | "chat";
  language?: string;
}) {
  const {
    accessRole,
    userId,
    currentPath = "",
    currentSection = inferCurrentSection(currentPath),
    pageTitle = "",
    propertyContext = "",
    mode = "voice",
    language = "English",
  } = options;

  const portfolioMemory = await buildPortfolioMemorySnapshot(accessRole, userId);
  const roleLabel = getRoleLabel(accessRole);
  const roleInstruction = getRoleInstruction(accessRole);
  const modeInstruction =
    mode === "chat"
      ? "You are currently in text chat mode. Do not mention voice, calls, microphones, or speaking unless the user explicitly asks about voice."
      : "You are currently in live voice mode. Keep spoken replies smooth, warm, and easy to follow.";
  const languageInstruction =
    language && language !== "English"
      ? `Reply fully in ${language} unless the user explicitly asks to change languages again.`
      : "Reply in English unless the user asks to switch languages.";

  return `You are Heidi, the voice and chat assistant for VMS Florida Property Management in Naples, Florida.
When greeting users always say "Welcome to VMS Florida Property Management".
Current access profile: ${roleLabel}.
You must be factual and use actual numbers only.
If a number, address, or property detail is not in your live memory snapshot or not returned by a tool, say you need to verify it first.
Never claim broader permissions than the current session actually has.

Operating rules:
1. Be direct, concise, and useful.
2. Answer the question first, then add one short next step only if helpful.
3. Ask at most one clarifying question when needed.
4. Be warm, calm, modern, and lightly conversational without filler.
5. Use the portfolio memory and Naples area guide below as your working memory.
6. Never guess prices, fees, or totals.
7. If you are unsure, say so plainly.

${modeInstruction}
${languageInstruction}

Current page context:
- Current path: ${currentPath || "unknown"}
- Current section: ${currentSection}
- Page title: ${pageTitle || "unknown"}
- Property/page entity context: ${propertyContext || "none"}
- Authenticated user id: ${userId || "guest"}
- Authenticated user role: ${accessRole}

Access policy for this session:
${roleInstruction}

${portfolioMemory}

${NAPLES_AREA_KNOWLEDGE}`.trim();
}
