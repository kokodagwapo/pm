export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import PricingRule from "@/models/PricingRule";
import PromoCode from "@/models/PromoCode";
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

    const { propertyId, unitId, startDate, endDate, couponCode } = body;

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

    const extraDiscounts: Array<{ type: string; label: string; amount: number; percentage?: number }> = [];
    let finalPrice = result.calculatedPrice;

    if (couponCode && typeof couponCode === "string") {
      const code = couponCode.trim().toUpperCase();
      const promo = await PromoCode.findOne({ code, active: true });

      if (!promo) {
        return createErrorResponse("Invalid or expired promo code", 400);
      }
      if (promo.expiresAt && promo.expiresAt < new Date()) {
        return createErrorResponse("This promo code has expired", 400);
      }
      if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
        return createErrorResponse("This promo code has reached its usage limit", 400);
      }
      if (result.totalNights < promo.minNights) {
        return createErrorResponse(
          `This promo code requires a minimum stay of ${promo.minNights} nights`,
          400
        );
      }

      let discountAmount = 0;
      if (promo.discountType === "percentage") {
        discountAmount = Math.round((finalPrice * promo.discountValue) / 100 * 100) / 100;
        extraDiscounts.push({
          type: "promo",
          label: `Promo: ${code}`,
          amount: discountAmount,
          percentage: promo.discountValue,
        });
      } else {
        discountAmount = Math.min(promo.discountValue, finalPrice);
        extraDiscounts.push({
          type: "promo",
          label: `Promo: ${code}`,
          amount: discountAmount,
        });
      }

      finalPrice = Math.max(0, finalPrice - discountAmount);
    }

    const allDiscounts = [...(result.discountsApplied || []), ...extraDiscounts];
    const totalDiscountAmount = allDiscounts.reduce((sum, d) => sum + d.amount, 0);

    return createSuccessResponse(
      {
        propertyId,
        unitId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        baseRentPerNight,
        ...result,
        calculatedPrice: finalPrice,
        discountsApplied: allDiscounts,
        totalDiscount: totalDiscountAmount,
        averagePricePerNight: result.totalNights > 0 ? finalPrice / result.totalNights : 0,
        couponApplied: couponCode ? couponCode.trim().toUpperCase() : null,
      },
      "Price calculated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
