export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { Property, RentalRequest, DateBlock } from "@/models";
import PricingRule from "@/models/PricingRule";
import { UserRole, RentalRequestStatus } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parsePaginationParams,
  createPaginationInfo,
  parseRequestBody,
  isValidObjectId,
  getOwnerPropertyAccess,
} from "@/lib/api-utils";
import { calculatePrice } from "@/lib/services/pricing.service";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) {
      return createErrorResponse("Authentication required", 401);
    }

    const user = session.user;
    const userRole = (user.role as UserRole) || UserRole.TENANT;
    const { searchParams } = new URL(request.url);
    const paginationParams = parsePaginationParams(searchParams);

    const query: any = {};

    if (userRole === UserRole.TENANT) {
      query.tenantId = user.id;
    } else if (userRole === UserRole.OWNER) {
      const ownerAccess = await getOwnerPropertyAccess(user.id);
      if (ownerAccess.ownedPropertyIds.length > 0) {
        query.propertyId = { $in: ownerAccess.ownedPropertyIds };
      } else {
        return createSuccessResponse(
          { requests: [] },
          "No rental requests found",
          createPaginationInfo(1, paginationParams.limit || 12, 0)
        );
      }
    }

    const status = searchParams.get("status");
    if (status && Object.values(RentalRequestStatus).includes(status as RentalRequestStatus)) {
      query.status = status;
    }

    const propertyId = searchParams.get("propertyId");
    if (propertyId && isValidObjectId(propertyId)) {
      query.propertyId = propertyId;
    }

    const unitId = searchParams.get("unitId");
    if (unitId && isValidObjectId(unitId)) {
      query.unitId = unitId;
    }

    const { page = 1, limit = 12 } = paginationParams;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      RentalRequest.find(query)
        .populate("propertyId", "name address images")
        .populate("tenantId", "firstName lastName email phone")
        .populate("respondedBy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RentalRequest.countDocuments(query),
    ]);

    return createSuccessResponse(
      { requests },
      "Rental requests fetched successfully",
      createPaginationInfo(page, limit, total)
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) {
      return createErrorResponse("Authentication required", 401);
    }

    const user = session.user;
    const userRole = (user.role as UserRole) || UserRole.TENANT;

    if (userRole !== UserRole.TENANT) {
      return createErrorResponse("Only tenants can create rental requests", 403);
    }

    const parsed = await parseRequestBody(request);
    if (!parsed.success) {
      return createErrorResponse(parsed.error || "Invalid request body", 400);
    }

    const { propertyId, unitId, requestedStartDate, requestedEndDate, tenantMessage } = parsed.data;

    if (!propertyId || !unitId || !requestedStartDate || !requestedEndDate) {
      return createErrorResponse(
        "Missing required fields: propertyId, unitId, requestedStartDate, requestedEndDate",
        400
      );
    }

    if (!isValidObjectId(propertyId) || !isValidObjectId(unitId)) {
      return createErrorResponse("Invalid property or unit ID", 400);
    }

    const startDate = new Date(requestedStartDate);
    const endDate = new Date(requestedEndDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return createErrorResponse("Invalid date format", 400);
    }

    if (startDate >= endDate) {
      return createErrorResponse("End date must be after start date", 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return createErrorResponse("Start date cannot be in the past", 400);
    }

    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    if (endDate > twoYearsFromNow) {
      return createErrorResponse("Cannot request rentals more than 2 years in advance", 400);
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return createErrorResponse("Property not found", 404);
    }

    const unit = property.units.find((u: any) => u._id && u._id.toString() === unitId);
    if (!unit) {
      return createErrorResponse("Unit not found in this property", 404);
    }

    const overlappingBlocks = await DateBlock.find({
      propertyId,
      unitId,
      isActive: true,
      $or: [
        {
          startDate: { $lt: endDate },
          endDate: { $gt: startDate },
        },
      ],
    });

    if (overlappingBlocks.length > 0) {
      return createErrorResponse(
        "Selected dates are blocked and unavailable for rental",
        409
      );
    }

    const Lease = (await import("@/models/Lease")).default;
    const overlappingLeases = await Lease.findOne({
      propertyId,
      unitId,
      status: { $in: ["active", "pending"] },
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
      deletedAt: null,
    });

    if (overlappingLeases) {
      return createErrorResponse(
        "Selected dates overlap with an existing lease",
        409
      );
    }

    const existingRequest = await RentalRequest.findOne({
      tenantId: user.id,
      propertyId,
      unitId,
      status: RentalRequestStatus.PENDING,
      $or: [
        {
          requestedStartDate: { $lt: endDate },
          requestedEndDate: { $gt: startDate },
        },
      ],
    });

    if (existingRequest) {
      return createErrorResponse(
        "You already have a pending request for overlapping dates on this unit",
        409
      );
    }

    const pricingRules = await PricingRule.find({
      propertyId,
      unitId,
      isActive: true,
    }).lean();

    const baseRentPerNight = unit.rentAmount / 30;

    const priceCalc = calculatePrice({
      baseRentPerNight,
      startDate,
      endDate,
      pricingRules: pricingRules as any,
      bookingDate: new Date(),
    });

    const rentalRequest = new RentalRequest({
      propertyId,
      unitId,
      tenantId: user.id,
      requestedStartDate: startDate,
      requestedEndDate: endDate,
      status: RentalRequestStatus.PENDING,
      basePrice: priceCalc.basePrice,
      calculatedPrice: priceCalc.calculatedPrice,
      totalNights: priceCalc.totalNights,
      discountsApplied: priceCalc.discountsApplied,
      priceBreakdown: {
        dailyBreakdown: priceCalc.dailyBreakdown,
        averagePricePerNight: priceCalc.averagePricePerNight,
        minimumStay: priceCalc.minimumStay,
        maximumStay: priceCalc.maximumStay,
      },
      tenantMessage: tenantMessage || undefined,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await rentalRequest.save();

    const populated = await RentalRequest.findById(rentalRequest._id)
      .populate("propertyId", "name address images")
      .populate("tenantId", "firstName lastName email")
      .lean();

    return createSuccessResponse(
      { request: populated },
      "Rental request created successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
