export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import PricingRule from "@/models/PricingRule";
import { Property } from "@/models";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
  isValidObjectId,
} from "@/lib/api-utils";
import { calculatePrice } from "@/lib/services/pricing.service";
import connectDB from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { success, data: body, error } = await parseRequestBody(request);
    if (!success) return createErrorResponse(error!, 400);

    const { propertyId, unitId, startDate, endDate } = body;

    if (!propertyId || !unitId || !startDate || !endDate) {
      return createErrorResponse("propertyId, unitId, startDate, and endDate are required", 400);
    }
    if (!isValidObjectId(propertyId) || !isValidObjectId(unitId)) {
      return createErrorResponse("Invalid property or unit ID", 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return createErrorResponse("Invalid date format", 400);
    }
    if (start >= end) {
      return createErrorResponse("End date must be after start date", 400);
    }

    const property = await Property.findById(propertyId).lean();
    if (!property) return createErrorResponse("Property not found", 404);

    const unit = (property as any).units?.find((u: any) => u._id?.toString() === unitId);
    if (!unit) return createErrorResponse("Unit not found", 404);

    const baseRentPerNight = unit.rentAmount ? unit.rentAmount / 30 : 0;
    if (baseRentPerNight <= 0) {
      return createErrorResponse("Unit does not have a valid rent amount", 400);
    }

    const pricingRules = await PricingRule.find({
      propertyId,
      unitId,
      isActive: true,
    }).lean();

    const result = calculatePrice({
      baseRentPerNight,
      startDate: start,
      endDate: end,
      pricingRules: pricingRules as any,
      bookingDate: new Date(),
    });

    return createSuccessResponse(
      {
        propertyId,
        unitId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        baseRentPerNight,
        ...result,
      },
      "Price calculated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
