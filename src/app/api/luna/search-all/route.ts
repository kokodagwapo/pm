import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { Property } from "@/models";
import { createErrorResponse, createSuccessResponse, handleApiError } from "@/lib/api-utils";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

function buildFeatureAwareQuery(rawQuery: string) {
  const query = rawQuery.trim();
  const normalized = query.toLowerCase();
  const lakeViewRegex = { $regex: "lake[ -]?view|lakefront|lake front", $options: "i" } as const;
  const tokens = Array.from(
    new Set(
      normalized
        .split(/[^a-z0-9]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !["with", "near", "the", "and"].includes(token))
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

function summarizeProperty(property: any) {
  const amenities = Array.isArray(property.amenities)
    ? property.amenities.map((amenity: any) => amenity?.name).filter(Boolean).slice(0, 12)
    : [];

  const units = Array.isArray(property.units)
    ? property.units.slice(0, 5).map((unit: any) => ({
        id: unit?._id?.toString?.() || undefined,
        unitNumber: unit?.unitNumber || null,
        bedrooms: unit?.bedrooms ?? null,
        bathrooms: unit?.bathrooms ?? null,
        rentAmount: unit?.rentAmount ?? null,
        status: unit?.status || null,
        notes: unit?.notes || null,
        balcony: Boolean(unit?.balcony),
        patio: Boolean(unit?.patio),
        garden: Boolean(unit?.garden),
        parking: unit?.parking
          ? {
              included: Boolean(unit.parking.included),
              spaces: unit.parking.spaces ?? 0,
              type: unit.parking.type || null,
              gated: Boolean(unit.parking.gated),
              assigned: Boolean(unit.parking.assigned),
            }
          : null,
      }))
    : [];

  return {
    id: property?._id?.toString?.() || undefined,
    name: property?.name || null,
    neighborhood: property?.neighborhood || null,
    status: property?.status || null,
    description: property?.description || null,
    address: property?.address || null,
    amenities,
    hoaCustomFields: property?.hoaCustomFields || [],
    units,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const session = await auth();
    const role = (session?.user?.role as UserRole | undefined) ?? null;
    const devDatabaseAccessEnabled = process.env.NODE_ENV !== "production";
    const canAccess =
      devDatabaseAccessEnabled ||
      role === UserRole.OWNER ||
      role === UserRole.MANAGER ||
      role === UserRole.ADMIN;

    if (!canAccess) {
      return createErrorResponse("Authentication required", 401);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const properties = await Property.find(buildFeatureAwareQuery(query))
    .select("-__v")
    .limit(10)
    .lean();

    return createSuccessResponse(
      properties.map((property) => summarizeProperty(property)),
      "Search results retrieved"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
