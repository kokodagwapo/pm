export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import PricingRule from "@/models/PricingRule";
import { Property } from "@/models";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
  parseRequestBody,
  isValidObjectId,
} from "@/lib/api-utils";
import { calculatePrice } from "@/lib/services/pricing.service";

export const POST = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
])(
  async (user: any, request: NextRequest) => {
    try {
      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

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

      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 2);
      if (end > maxDate) {
        return createErrorResponse("Booking cannot be more than 2 years in advance", 400);
      }

      const property = await Property.findById(propertyId).lean();
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      if (user.role === UserRole.OWNER && (property as any).ownerId?.toString() !== user.id) {
        return createErrorResponse("You can only calculate pricing for properties you own", 403);
      }

      const unit = (property as any).units?.find((u: any) => u._id?.toString() === unitId);
      if (!unit) {
        return createErrorResponse("Unit not found", 404);
      }

      const baseRentPerNight = unit.rentAmount ? unit.rentAmount / 30 : 0;

      if (baseRentPerNight <= 0) {
        return createErrorResponse("Unit does not have a valid rent amount configured", 400);
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

      if (result.minimumStay && result.totalNights < result.minimumStay) {
        return createErrorResponse(
          `Minimum stay requirement not met. Minimum: ${result.minimumStay} nights, requested: ${result.totalNights} nights`,
          400
        );
      }

      if (result.maximumStay && result.totalNights > result.maximumStay) {
        return createErrorResponse(
          `Maximum stay exceeded. Maximum: ${result.maximumStay} nights, requested: ${result.totalNights} nights`,
          400
        );
      }

      return createSuccessResponse(
        {
          propertyId,
          unitId,
          unitName: unit.unitNumber,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          ...result,
        },
        "Price calculated successfully"
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
);
