/**
 * SmartStartPM - Public Single Property API
 * Returns a single property for the property details page
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
  isValidObjectId,
} from "@/lib/api-utils";
import connectDB from "@/lib/mongodb";
import { calculatePropertyStatusFromUnits } from "@/utils/property-status-calculator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!isValidObjectId(id)) {
      return createErrorResponse("Invalid property ID", 400);
    }

    const property = await Property.findOne({
      _id: id,
      deletedAt: null,
    })
      .select("-__v")
      .lean();

    if (!property) {
      return createErrorResponse("Property not found", 404);
    }

    const propertyObj = property as any;
    if (Array.isArray(propertyObj.units) && propertyObj.units.length > 0) {
      const unitStatuses = propertyObj.units
        .map((u: any) => u?.status)
        .filter((s: any) => Object.values(PropertyStatus).includes(s));
      if (unitStatuses.length > 0) {
        propertyObj.status = calculatePropertyStatusFromUnits(unitStatuses);
      }
    }

    return createSuccessResponse(
      propertyObj,
      "Property retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
