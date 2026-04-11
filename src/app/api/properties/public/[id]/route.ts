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
import DateBlock from "@/models/DateBlock";
import PricingRule from "@/models/PricingRule";
import { stripUnitSecretsForPublicApi } from "@/lib/unit-access-secrets";

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

    const now = new Date();
    const twoYearsOut = new Date();
    twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);

    const unitIds = (propertyObj.units || []).map((u: any) => u._id);

    const [blocks, pricingRules] = await Promise.all([
      DateBlock.find({
        propertyId: id,
        unitId: { $in: unitIds },
        isActive: true,
        endDate: { $gte: now },
        startDate: { $lte: twoYearsOut },
      })
        .select("propertyId unitId startDate endDate blockType")
        .sort({ startDate: 1 })
        .lean(),
      PricingRule.find({
        propertyId: id,
        unitId: { $in: unitIds },
        isActive: true,
      })
        .select("propertyId unitId name ruleType startDate endDate pricePerNight priceModifier daysOfWeek minimumStay priority")
        .sort({ priority: -1 })
        .lean(),
    ]);

    propertyObj.availability = {
      blocks: blocks.map((b: any) => ({
        _id: b._id,
        unitId: b.unitId,
        startDate: b.startDate,
        endDate: b.endDate,
        blockType: b.blockType,
      })),
      pricingRules: pricingRules.map((r: any) => ({
        _id: r._id,
        unitId: r.unitId,
        name: r.name,
        ruleType: r.ruleType,
        startDate: r.startDate,
        endDate: r.endDate,
        pricePerNight: r.pricePerNight,
        priceModifier: r.priceModifier,
        daysOfWeek: r.daysOfWeek,
        minimumStay: r.minimumStay,
        isActive: true,
      })),
    };

    // Never expose unit access secrets on the public listing API
    if (Array.isArray(propertyObj.units)) {
      propertyObj.units = propertyObj.units.map((u: Record<string, unknown>) =>
        stripUnitSecretsForPublicApi(u)
      );
    }

    return createSuccessResponse(
      propertyObj,
      "Property retrieved successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
