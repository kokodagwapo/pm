import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { Property } from "@/models";
import { getImageWithFallback } from "@/lib/utils/image-utils";
import { UserRole } from "@/types";
import type { HeidiAccessRole } from "@/lib/ai/luna-tools";
import { buildHeidiInstructions, inferCurrentSection } from "@/lib/ai/heidi-context";

export const dynamic = "force-dynamic";

interface ChatPropertyCard {
  id: string;
  href: string;
  name: string;
  location: string;
  imageUrl: string;
  priceLabel: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  summary: string;
  highlights: string[];
}

function buildFeatureAwareQuery(rawQuery: string) {
  const query = rawQuery.trim();
  const normalized = query.toLowerCase();
  const lakeViewRegex = {
    $regex: "lake[ -]?view|lakefront|lake front",
    $options: "i",
  } as const;
  const tokens = Array.from(
    new Set(
      normalized
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 3 &&
            !["with", "near", "the", "and", "show", "find"].includes(token)
        )
    )
  );

  const tokenConditions = (tokens.length ? tokens : [query]).map((token) => {
    const compact = token.replace(/[^a-z0-9]/g, "");
    const regex = { $regex: token, $options: "i" } as const;
    const orConditions: Record<string, unknown>[] = [
      { name: regex },
      { description: regex },
      { "address.street": regex },
      { "address.city": regex },
      { neighborhood: regex },
      { "amenities.name": regex },
      { "hoaCustomFields.key": regex },
      { "hoaCustomFields.value": regex },
      { "units.notes": regex },
      { "units.unitNumber": regex },
    ];

    if (compact === "lakeview" || compact === "lake" || compact === "lakefront") {
      orConditions.push(
        { description: lakeViewRegex },
        { "amenities.name": lakeViewRegex },
        { "units.notes": lakeViewRegex }
      );
    }

    if (compact === "garage") {
      orConditions.push(
        { "units.parking.type": "garage" },
        { "amenities.name": { $regex: "garage", $options: "i" } },
        { description: { $regex: "garage", $options: "i" } },
        { "units.notes": { $regex: "garage", $options: "i" } }
      );
    }

    return { $or: orConditions };
  });

  return { deletedAt: null, $and: tokenConditions };
}

function looksLikePropertySearch(message: string, currentPath: string) {
  const normalized = message.toLowerCase();
  const hasListingKeyword =
    /(available|availability|rental|rentals|property|properties|condo|house|apartment|townhome|townhouse|bedroom|bedrooms|studio|garage|lakeview|lake view|pet|pets|naples|show me|find me|looking for|what's available|what is available|2 bedroom|3 bedroom)/i.test(
      normalized
    );

  if (hasListingKeyword) {
    return true;
  }

  return (
    (currentPath.startsWith("/rentals") || currentPath.startsWith("/properties")) &&
    /(show|find|available|options|units|listings|homes|condos|rentals)/i.test(normalized)
  );
}

function formatPriceLabel(amount: unknown) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const value = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);

  return amount > 500 ? `${value}/mo` : `${value}/night`;
}

function trimSummary(text: unknown, fallback: string) {
  const value = typeof text === "string" ? text.trim() : "";
  if (!value) return fallback;
  if (value.length <= 132) return value;
  return `${value.slice(0, 129).trimEnd()}...`;
}

function formatLocation(property: any) {
  const street = property?.address?.street;
  const city = property?.address?.city;
  const state = property?.address?.state;
  const neighborhood = property?.neighborhood;

  return [street, neighborhood, [city, state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" • ");
}

function buildHighlights(property: any, unit: any) {
  const highlights: string[] = [];

  if (typeof unit?.bedrooms === "number") highlights.push(`${unit.bedrooms} bed`);
  if (typeof unit?.bathrooms === "number") highlights.push(`${unit.bathrooms} bath`);
  if (unit?.parking?.type) highlights.push(String(unit.parking.type));

  const amenityNames = Array.isArray(property?.amenities)
    ? property.amenities
        .map((amenity: any) => amenity?.name)
        .filter((name: unknown): name is string => typeof name === "string" && Boolean(name))
    : [];

  for (const amenity of amenityNames) {
    if (highlights.length >= 4) break;
    highlights.push(amenity);
  }

  return highlights.slice(0, 4);
}

function extractSearchTokens(message: string) {
  return Array.from(
    new Set(
      message
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 3 &&
            ![
              "the",
              "and",
              "for",
              "with",
              "show",
              "find",
              "available",
              "availability",
              "rental",
              "rentals",
              "property",
              "properties",
              "bedroom",
              "bedrooms",
              "condo",
              "condos",
              "house",
              "houses",
              "apartment",
              "apartments",
            ].includes(token)
        )
    )
  );
}

function extractBedroomCount(message: string) {
  const match = message.match(/(\d+)\s*[- ]?\s*bed(?:room)?/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function propertyMatchesMessage(property: any, message: string) {
  const tokens = extractSearchTokens(message);
  const bedroomCount = extractBedroomCount(message);
  const searchableText = [
    property?.name,
    property?.description,
    property?.neighborhood,
    property?.address?.street,
    property?.address?.city,
    property?.address?.state,
    ...(Array.isArray(property?.amenities)
      ? property.amenities.map((amenity: any) => amenity?.name)
      : []),
    ...(Array.isArray(property?.units)
      ? property.units.flatMap((unit: any) => [unit?.unitNumber, unit?.notes, unit?.parking?.type])
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tokenMatch =
    tokens.length === 0 || tokens.every((token) => searchableText.includes(token));

  const bedroomMatch =
    bedroomCount === null ||
    (Array.isArray(property?.units) &&
      property.units.some((unit: any) => unit?.bedrooms === bedroomCount));

  return tokenMatch && bedroomMatch;
}

async function getChatPropertyCards(options: {
  message: string;
  accessRole: HeidiAccessRole;
  userId?: string;
}) {
  const { message, accessRole, userId } = options;
  await connectDB();

  const dbQuery = buildFeatureAwareQuery(message) as Record<string, unknown>;
  if (accessRole === "guest" || accessRole === UserRole.TENANT) {
    dbQuery.status = "available";
  } else if (accessRole === UserRole.OWNER && userId) {
    dbQuery.ownerId = userId;
  } else if (accessRole === UserRole.MANAGER && userId) {
    dbQuery.managerId = userId;
  }

  let properties = await Property.find(dbQuery)
    .select("name description neighborhood address amenities images status units")
    .limit(4)
    .lean();

  if (properties.length === 0) {
    const relaxedQuery: Record<string, unknown> = { deletedAt: null };
    if (accessRole === "guest" || accessRole === UserRole.TENANT) {
      relaxedQuery.status = "available";
    } else if (accessRole === UserRole.OWNER && userId) {
      relaxedQuery.ownerId = userId;
    } else if (accessRole === UserRole.MANAGER && userId) {
      relaxedQuery.managerId = userId;
    }

    properties = (await Property.find(relaxedQuery)
      .select("name description neighborhood address amenities images status units")
      .limit(24)
      .lean())
      .filter((property: any) => propertyMatchesMessage(property, message))
      .slice(0, 4);
  }

  return properties.map((property: any) => {
    const units = Array.isArray(property?.units) ? property.units : [];
    const bestUnit =
      units.find((unit: any) => unit?.status === "available" && typeof unit?.rentAmount === "number") ||
      units.find((unit: any) => typeof unit?.rentAmount === "number") ||
      units[0] ||
      null;

    return {
      id: String(property._id),
      href: `/properties/${String(property._id)}`,
      name: property?.name || "Property",
      location: formatLocation(property),
      imageUrl: getImageWithFallback(property),
      priceLabel: formatPriceLabel(bestUnit?.rentAmount),
      bedrooms: typeof bestUnit?.bedrooms === "number" ? bestUnit.bedrooms : null,
      bathrooms: typeof bestUnit?.bathrooms === "number" ? bestUnit.bathrooms : null,
      summary: trimSummary(
        property?.description,
        "Well-located rental with current availability and more details inside."
      ),
      highlights: buildHighlights(property, bestUnit),
    } satisfies ChatPropertyCard;
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const requestBody = await request.json().catch(() => ({}));
    const message =
      typeof requestBody?.message === "string" ? requestBody.message.trim() : "";

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const accessRole: HeidiAccessRole = session?.user?.role
      ? (session.user.role as UserRole)
      : "guest";
    const currentPath =
      typeof requestBody?.currentPath === "string" ? requestBody.currentPath : "";
    const pageTitle =
      typeof requestBody?.pageTitle === "string" ? requestBody.pageTitle : "";
    const currentSection =
      typeof requestBody?.currentSection === "string"
        ? requestBody.currentSection
        : inferCurrentSection(currentPath);
    const propertyContext =
      requestBody?.propertyContext && typeof requestBody.propertyContext === "object"
        ? JSON.stringify(requestBody.propertyContext).slice(0, 1200)
        : "";
    const language =
      typeof requestBody?.language === "string" && requestBody.language.trim()
        ? requestBody.language.trim()
        : "English";
    const shouldAttachPropertyCards = looksLikePropertySearch(message, currentPath);
    const propertyCards = shouldAttachPropertyCards
      ? await getChatPropertyCards({
          message,
          accessRole,
          userId: session?.user?.id,
        }).catch(() => [])
      : [];

    const instructions = await buildHeidiInstructions({
      accessRole,
      userId: session?.user?.id,
      currentPath,
      currentSection,
      pageTitle,
      propertyContext,
      mode: "chat",
      language,
    });

    const history = Array.isArray(requestBody?.messages)
      ? requestBody.messages
          .filter(
            (entry: any) =>
              entry &&
              (entry.role === "user" || entry.role === "assistant") &&
              typeof entry.content === "string" &&
              entry.content.trim()
          )
          .slice(-10)
          .map((entry: any) => ({
            role: entry.role as "user" | "assistant",
            content: entry.content,
          }))
      : [];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 420,
      messages: [
        { role: "system", content: instructions },
        ...(propertyCards.length > 0
          ? [
              {
                role: "system" as const,
                content:
                  "Relevant property matches are attached for the UI. Keep the reply concise, warm, and useful. Do not dump long bullet lists when the cards already show the listings. Mention only the most relevant 1-3 options and invite the user to tap a card for details.\n\nMatches:\n" +
                  JSON.stringify(propertyCards),
              },
            ]
          : []),
        ...history,
        { role: "user", content: message },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "I could not generate a reply just now. Please try again.";

    return NextResponse.json({ reply, propertyCards });
  } catch (error) {
    console.error("Heidi chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
