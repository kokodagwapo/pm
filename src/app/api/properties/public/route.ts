/**
 * SmartStartPM - Public Properties API
 * Returns property listings for landing page and public property search
 * No authentication required
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { Property } from "@/models";
import { PropertyStatus } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parsePaginationParams,
} from "@/lib/api-utils";
import { connectDBSafe, isConnected } from "@/lib/mongodb";
import { calculatePropertyStatusFromUnits } from "@/utils/property-status-calculator";
import { stripUnitSecretsForPublicApi } from "@/lib/unit-access-secrets";
import { VMS_FLORIDA_PROPERTIES } from "@/lib/vms-florida-properties";

function applyClientFilters(props: any[], params: URLSearchParams) {
  let filtered = [...props];
  const search = params.get("search")?.toLowerCase();
  const type = params.get("type");
  const bedrooms = params.get("bedrooms") ? parseInt(params.get("bedrooms")!) : undefined;
  const neighborhood = params.get("neighborhood");
  const minRent = params.get("minRent") ? parseFloat(params.get("minRent")!) : undefined;
  const maxRent = params.get("maxRent") ? parseFloat(params.get("maxRent")!) : undefined;

  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search) ||
      p.neighborhood?.toLowerCase().includes(search) ||
      p.address?.street?.toLowerCase().includes(search)
    );
  }
  if (type) filtered = filtered.filter(p => p.type === type);
  if (bedrooms) filtered = filtered.filter(p => (p.units?.[0]?.bedrooms ?? 0) >= bedrooms);
  if (neighborhood) filtered = filtered.filter(p => p.neighborhood?.toLowerCase().includes(neighborhood.toLowerCase()));
  if (minRent) filtered = filtered.filter(p => (p.units?.[0]?.rentAmount ?? 0) >= minRent);
  if (maxRent) filtered = filtered.filter(p => (p.units?.[0]?.rentAmount ?? 0) <= maxRent);

  return filtered;
}

function buildFallbackResponse(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "24"), 50);
  const filtered = applyClientFilters(VMS_FLORIDA_PROPERTIES, searchParams);
  const total = filtered.length;
  const skip = (page - 1) * limit;
  const paged = filtered.slice(skip, skip + limit);

  return createSuccessResponse(
    {
      properties: paged,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
    "Properties retrieved successfully"
  );
}

export async function GET(request: NextRequest) {
  try {
    let db: Awaited<ReturnType<typeof connectDBSafe>>;
    if (isConnected()) {
      db = await connectDBSafe();
    } else {
      const raceResult = await Promise.race([
        connectDBSafe(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 800)),
      ]);
      db = raceResult;
    }
    if (!db) {
      return buildFallbackResponse(new URL(request.url).searchParams);
    }

    const { searchParams } = new URL(request.url);
    const paginationParams = parsePaginationParams(searchParams);

    const page = paginationParams.page;
    const limit = Math.min(paginationParams.limit, 50);
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const minRent = searchParams.get("minRent")
      ? parseFloat(searchParams.get("minRent")!)
      : undefined;
    const maxRent = searchParams.get("maxRent")
      ? parseFloat(searchParams.get("maxRent")!)
      : undefined;
    const bedrooms = searchParams.get("bedrooms")
      ? parseInt(searchParams.get("bedrooms")!)
      : undefined;
    const city = searchParams.get("city") || undefined;
    const neighborhood = searchParams.get("neighborhood") || undefined;
    const parkingTypeRaw = (searchParams.get("parkingType") || "").toLowerCase();
    const parkingTypes = ["garage", "covered", "open", "street"] as const;
    const parkingType = parkingTypes.includes(parkingTypeRaw as (typeof parkingTypes)[number])
      ? parkingTypeRaw
      : undefined;

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      deletedAt: null,
    };

    if (type) query.type = type;
    if (parkingType) (query as any)["units.parking.type"] = parkingType;
    if (minRent || maxRent) {
      (query as any)["units.rentAmount"] = {};
      if (minRent) (query as any)["units.rentAmount"].$gte = minRent;
      if (maxRent) (query as any)["units.rentAmount"].$lte = maxRent;
    }
    if (bedrooms) (query as any)["units.bedrooms"] = { $gte: bedrooms };
    if (city)
      (query as any)["address.city"] = { $regex: city, $options: "i" };
    if (neighborhood)
      (query as any).neighborhood = { $regex: neighborhood, $options: "i" };
    if (search) {
      (query as any).$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
        { "address.street": { $regex: search, $options: "i" } },
        { "address.state": { $regex: search, $options: "i" } },
        { "address.zipCode": { $regex: search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      Property.find(query)
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.countDocuments(query),
    ]);

    const properties = data.map((property: any) => {
      if (Array.isArray(property.units) && property.units.length > 0) {
        const unitStatuses = property.units
          .map((u: any) => u?.status)
          .filter((s: any) => Object.values(PropertyStatus).includes(s));
        if (unitStatuses.length > 0) {
          property.status = calculatePropertyStatusFromUnits(unitStatuses);
        }
        property.units = property.units.map((u: Record<string, unknown>) =>
          stripUnitSecretsForPublicApi(u)
        );
      }
      return property;
    });

    return createSuccessResponse(
      { properties, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      "Properties retrieved successfully"
    );
  } catch (error) {
    console.error("Public properties API error, returning fallback:", (error as Error)?.message);
    return buildFallbackResponse(new URL(request.url).searchParams);
  }
}
