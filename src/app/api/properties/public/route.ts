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
import connectDB from "@/lib/mongodb";
import { calculatePropertyStatusFromUnits } from "@/utils/property-status-calculator";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      deletedAt: null,
    };

    if (type) query.type = type;
    if (minRent || maxRent) {
      (query as any)["units.rentAmount"] = {};
      if (minRent) (query as any)["units.rentAmount"].$gte = minRent;
      if (maxRent) (query as any)["units.rentAmount"].$lte = maxRent;
    }
    if (bedrooms) (query as any)["units.bedrooms"] = { $gte: bedrooms };
    if (city)
      (query as any)["address.city"] = { $regex: city, $options: "i" };
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
      }
      return property;
    });

    return createSuccessResponse(
      { properties, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
      "Properties retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
