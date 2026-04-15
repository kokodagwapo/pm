import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import { getLunaToolsForRole, HeidiAccessRole } from "@/lib/ai/luna-tools";
import { Property } from "@/models";
import { connectDBSafe } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

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

const NAPLES_AREA_KNOWLEDGE = `
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

function inferCurrentSection(currentPath?: string | null) {
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const apiKey = process.env.OPENAI_API_KEY;
    const requestBody = await request.json().catch(() => ({}));
    const devDatabaseAccessEnabled = process.env.NODE_ENV !== "production";

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 503 });
    }

    const accessRole: HeidiAccessRole = session?.user?.role
      ? (session.user.role as UserRole)
      : "guest";
    const currentPath = typeof requestBody?.currentPath === "string" ? requestBody.currentPath : "";
    const pageTitle = typeof requestBody?.pageTitle === "string" ? requestBody.pageTitle : "";
    const currentSection =
      typeof requestBody?.currentSection === "string"
        ? requestBody.currentSection
        : inferCurrentSection(currentPath);
    const propertyContext =
      requestBody?.propertyContext && typeof requestBody.propertyContext === "object"
        ? JSON.stringify(requestBody.propertyContext).slice(0, 1200)
        : "";

    const portfolioMemory = await buildPortfolioMemorySnapshot(accessRole, session?.user?.id);
    const allowedTools = getLunaToolsForRole(accessRole, {
      includeDevelopmentDbTools: devDatabaseAccessEnabled,
    });

    let roleLabel = "Public visitor";
    if (accessRole === UserRole.TENANT) roleLabel = "Authenticated tenant";
    if (accessRole === UserRole.OWNER) roleLabel = "Authenticated owner";
    if (accessRole === UserRole.MANAGER) roleLabel = "Property manager";
    if (accessRole === UserRole.ADMIN) roleLabel = "Administrator";

    const roleInstruction =
      accessRole === "guest"
        ? devDatabaseAccessEnabled
          ? "You are in development-database mode for a local/dev environment. You may use non-secret property and listing tools across the development database to answer feature questions like lake view, garage, HOA, amenities, and notes. Never reveal WiFi passwords, door codes, owner-private financials, or anything not returned by the safe tools."
          : "You are in visitor mode. Use only public website content, public listings, public pricing, and public knowledge. Do not imply account access."
        : accessRole === UserRole.TENANT
          ? "You may use tenant-safe account, booking, FAQ, property, calendar, and maintenance data only when the APIs permit it."
          : accessRole === UserRole.OWNER
            ? "You may use owner-safe property and calendar data scoped to owned properties plus approved internal tools."
            : accessRole === UserRole.MANAGER
              ? "You may use management-safe property, listing, FAQ, and calendar data scoped by the application's permission layer."
              : "You may use administrator-approved tools and internal data, but still never reveal restricted fields unless the API returns them for this session.";
    
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-realtime-preview-2024-12-17",
        voice: "shimmer", // Feminine, friendly voice preset
        instructions: `You are Heidi, the voice and chat assistant for VMS Florida Property Management in Naples, Florida.
        When greeting users always say "Welcome to VMS Florida Property Management".
        Current access profile: ${roleLabel}.
        You must be factual and use actual numbers only.
        If a number, address, or property detail is not in your live memory snapshot or not returned by a tool, say you need to verify it and then use a tool.
        Never claim broader permissions than the current session actually has.
        ${devDatabaseAccessEnabled ? "Development database access override is enabled for safe property-detail lookup in this environment." : ""}
        
        Operating rules:
        1. Use the tools available in this session to search listings, calculate totals, read FAQs, check schedules, and inspect property details.
        2. Financial Authority: You compute exact totals using 'calculate_total_pricing' and offer insights only when supported by live data.
        3. Execution: Only perform booking, maintenance, calendar, or account actions through approved tools.
        4. Strategic Insight: Analyze property details using 'get_property_insights' to give the best advice on which property fits the user's goals.
        5. Permission safety: If a tool is unavailable or returns a permission error, explain that simply and offer the next safe step.
        
        Core Directives:
        1. Be Direct & Concise: Provide helpful, accurate answers immediately without unnecessary filler.
        2. Speak Deliberately: Maintain a relaxed, clear, slightly brighter speaking pace. Do not rush unnaturally, but once the user clearly finishes a question, respond promptly.
        2a. Voice Delivery: Sound feminine, warm, friendly, and accommodating. Use a lighter, softer, more upbeat tone. Avoid sounding low, flat, stern, robotic, or heavy.
        3. Memory & Personalization: Memorize user preferences, names, and details mentioned during the chat.
        4. Knowledge Master: You have the full Naples Area Guide, weather, parks, beaches, dining, government services, and before-you-arrive checklist memorized below. Answer those questions directly from memory. Use 'search_knowledge_base' only for deeper VMS policy details or property-specific amenities not covered in memory.
        5. Portfolio Grounding: Start from the live portfolio snapshot below and treat it as your working memory for counts, names, locations, and addresses.
        6. Pricing Accuracy: Never guess rates, totals, or fees. Use 'calculate_total_pricing' when money matters.
        7. First answer short: Give the answer first, then add one short next step if helpful.
        8. Clarify once: Ask at most one clarifying question if needed.
        9. Noise / unclear speech: Ignore background sounds, TV audio, keyboard clicks, dogs, music, room echo, and side conversations that are not clearly directed to you.
        10. If speech is unclear or incomplete, ask for a short repeat instead of guessing.
        11. Humor: Be warm and occasionally funny in a light, natural way when it fits the moment, but never at the expense of clarity or factual accuracy.
        
        Persona: You are Heidi, warm, calm, direct, highly useful, and sometimes gently funny. You sound like a friendly, welcoming female concierge with a soft, pleasant, higher-register delivery. Avoid generic assistant filler like "I'd be happy to help" or "Certainly."

        Current page context:
        - Current path: ${currentPath || "unknown"}
        - Current section: ${currentSection}
        - Page title: ${pageTitle || "unknown"}
        - Property/page entity context: ${propertyContext || "none"}
        - Authenticated user id: ${session?.user?.id || "guest"}
        - Authenticated user role: ${accessRole}

        Access policy for this session:
        ${roleInstruction}

        ${portfolioMemory}

        ${NAPLES_AREA_KNOWLEDGE}`,
        modalities: ["text", "audio"],
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        input_audio_noise_reduction: {
          type: "near_field",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.84,
          prefix_padding_ms: 300,
          silence_duration_ms: 1200,
          create_response: false,
          interrupt_response: true,
        },
        tool_choice: "auto",
        tools: allowedTools.map(tool => ({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }))
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("OpenAI session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
