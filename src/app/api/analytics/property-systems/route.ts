/**
 * SmartStartPM — Property Systems API
 * GET  /api/analytics/property-systems?propertyId=...  — fetch system data
 * PUT  /api/analytics/property-systems                 — upsert system data
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Property } from "@/models";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";
import PropertySystems from "@/models/PropertySystems";

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      return createErrorResponse("propertyId is required", 400);
    }

    const pid = new mongoose.Types.ObjectId(propertyId);

    // Verify access
    const propQuery: Record<string, unknown> = { _id: pid, deletedAt: null };
    if (user.role === UserRole.OWNER) propQuery.ownerId = user.id;
    const property = await Property.findOne(propQuery).select("_id name").lean();
    if (!property) return createErrorResponse("Property not found or access denied", 404);

    const record = await PropertySystems.findOne({ propertyId: pid }).lean();
    return createSuccessResponse(record ?? { propertyId, systems: [], marketRent: null });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PUT = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    const { propertyId, systems, marketRent } = body;

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      return createErrorResponse("propertyId is required", 400);
    }

    const pid = new mongoose.Types.ObjectId(propertyId);

    // Verify access
    const propQuery: Record<string, unknown> = { _id: pid, deletedAt: null };
    if (user.role === UserRole.OWNER) propQuery.ownerId = user.id;
    const property = await Property.findOne(propQuery).select("_id").lean();
    if (!property) return createErrorResponse("Property not found or access denied", 404);

    const thisYear = new Date().getFullYear();
    const update: Record<string, unknown> = {};
    if (Array.isArray(systems)) {
      // Sanitize: convert invalid/zero lastReplacedYear values to undefined
      update.systems = systems.map((s: { systemType?: string; lastReplacedYear?: number; estimatedLifespanYears?: number; notes?: string }) => ({
        ...s,
        lastReplacedYear: s.lastReplacedYear && s.lastReplacedYear > 1900 && s.lastReplacedYear <= thisYear
          ? s.lastReplacedYear
          : undefined,
        estimatedLifespanYears: s.estimatedLifespanYears && s.estimatedLifespanYears > 0 ? s.estimatedLifespanYears : 20,
      }));
    }
    if (marketRent !== undefined) update.marketRent = marketRent && marketRent > 0 ? marketRent : null;

    const record = await PropertySystems.findOneAndUpdate(
      { propertyId: pid },
      { $set: update },
      { upsert: true, new: true }
    );

    return createSuccessResponse(record);
  } catch (error) {
    return handleApiError(error);
  }
});
