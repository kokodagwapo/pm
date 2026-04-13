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

const FALLBACK_PUBLIC_PROPERTIES = [
  {
    _id: "fallback-public-1",
    name: "Falling Waters Lakeview Condo",
    type: "condo",
    status: "available",
    neighborhood: "Falling Waters",
    address: {
      street: "7050 Falling Waters Drive",
      city: "Naples",
      state: "FL",
      zipCode: "34119",
      country: "United States",
    },
    images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=85"],
    units: [
      {
        _id: "fallback-public-unit-1",
        unitNumber: "C442-LV",
        bedrooms: 2,
        bathrooms: 2,
        squareFootage: 1200,
        rentAmount: 3900,
        status: "available",
      },
    ],
  },
  {
    _id: "fallback-public-2",
    name: "World Tennis Club Condo",
    type: "condo",
    status: "available",
    neighborhood: "World Tennis Club",
    address: {
      street: "3650 Olympic Drive",
      city: "Naples",
      state: "FL",
      zipCode: "34105",
      country: "United States",
    },
    images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=85"],
    units: [
      {
        _id: "fallback-public-unit-2",
        unitNumber: "C373-WTC",
        bedrooms: 2,
        bathrooms: 2,
        squareFootage: 1100,
        rentAmount: 3900,
        status: "available",
      },
    ],
  },
];

const FALLBACK_RESPONSE = () =>
  createSuccessResponse(
    {
      properties: FALLBACK_PUBLIC_PROPERTIES,
      pagination: { page: 1, limit: 24, total: FALLBACK_PUBLIC_PROPERTIES.length, pages: 1 },
    },
    "Properties retrieved successfully"
  );

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
      return FALLBACK_RESPONSE();
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
    if (parkingType) (query as any)["parking.type"] = parkingType;
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
    return FALLBACK_RESPONSE();
  }
}
