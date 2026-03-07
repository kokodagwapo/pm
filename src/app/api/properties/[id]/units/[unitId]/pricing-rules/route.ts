export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import PricingRule from "@/models/PricingRule";
import { Property } from "@/models";
import { UserRole, PricingRuleType } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
  parseRequestBody,
  isValidObjectId,
} from "@/lib/api-utils";

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(
  async (
    user: any,
    request: NextRequest,
    { params }: { params: Promise<{ id: string; unitId: string }> }
  ) => {
    try {
      const { id, unitId } = await params;

      if (!isValidObjectId(id) || !isValidObjectId(unitId)) {
        return createErrorResponse("Invalid property or unit ID", 400);
      }

      const property = await Property.findById(id).lean();
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      if (user.role === UserRole.OWNER && property.ownerId?.toString() !== user.id) {
        return createErrorResponse("You can only view pricing for properties you own", 403);
      }

      const unit = (property as any).units?.find((u: any) => u._id?.toString() === unitId);
      if (!unit) {
        return createErrorResponse("Unit not found", 404);
      }

      const { searchParams } = new URL(request.url);
      const activeOnly = searchParams.get("activeOnly") === "true";
      const ruleType = searchParams.get("ruleType");

      const query: any = { propertyId: id, unitId };
      if (activeOnly) query.isActive = true;
      if (ruleType && Object.values(PricingRuleType).includes(ruleType as PricingRuleType)) {
        query.ruleType = ruleType;
      }

      const rules = await PricingRule.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .populate("createdBy", "firstName lastName email")
        .lean();

      return createSuccessResponse(rules, "Pricing rules retrieved successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const POST = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(
  async (
    user: any,
    request: NextRequest,
    { params }: { params: Promise<{ id: string; unitId: string }> }
  ) => {
    try {
      const { id, unitId } = await params;

      if (!isValidObjectId(id) || !isValidObjectId(unitId)) {
        return createErrorResponse("Invalid property or unit ID", 400);
      }

      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      const property = await Property.findById(id).lean();
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      if (user.role === UserRole.OWNER && property.ownerId?.toString() !== user.id) {
        return createErrorResponse("You can only manage pricing for properties you own", 403);
      }

      const unit = (property as any).units?.find((u: any) => u._id?.toString() === unitId);
      if (!unit) {
        return createErrorResponse("Unit not found", 404);
      }

      if (!body.name || !body.ruleType) {
        return createErrorResponse("Name and rule type are required", 400);
      }

      if (!Object.values(PricingRuleType).includes(body.ruleType)) {
        return createErrorResponse(`Invalid rule type. Must be one of: ${Object.values(PricingRuleType).join(", ")}`, 400);
      }

      const needsDateRange = [
        PricingRuleType.DAILY_OVERRIDE,
        PricingRuleType.SEASONAL,
        PricingRuleType.HOLIDAY,
        PricingRuleType.LAST_MINUTE,
      ];
      if (needsDateRange.includes(body.ruleType)) {
        if (!body.startDate || !body.endDate) {
          return createErrorResponse(`Rule type '${body.ruleType}' requires startDate and endDate`, 400);
        }
        const s = new Date(body.startDate);
        const e = new Date(body.endDate);
        if (isNaN(s.getTime()) || isNaN(e.getTime()) || s >= e) {
          return createErrorResponse("Invalid date range: endDate must be after startDate", 400);
        }
      }

      const needsDaysOfWeek = [PricingRuleType.WEEKEND, PricingRuleType.WEEKDAY];
      if (needsDaysOfWeek.includes(body.ruleType)) {
        if (!body.daysOfWeek || !Array.isArray(body.daysOfWeek) || body.daysOfWeek.length === 0) {
          return createErrorResponse(`Rule type '${body.ruleType}' requires daysOfWeek array`, 400);
        }
        if (body.daysOfWeek.some((d: any) => typeof d !== 'number' || d < 0 || d > 6)) {
          return createErrorResponse("daysOfWeek must contain numbers 0-6 (Sun=0, Sat=6)", 400);
        }
      }

      if (!body.pricePerNight && !body.priceModifier) {
        const discountTypes = [PricingRuleType.LONG_TERM_DISCOUNT, PricingRuleType.EARLY_BIRD_DISCOUNT];
        if (!discountTypes.includes(body.ruleType)) {
          return createErrorResponse("Either pricePerNight or priceModifier is required", 400);
        }
      }

      if (body.priceModifier) {
        if (!['fixed', 'percentage'].includes(body.priceModifier.type) || typeof body.priceModifier.value !== 'number') {
          return createErrorResponse("priceModifier requires type ('fixed'|'percentage') and numeric value", 400);
        }
      }

      const rule = new PricingRule({
        ...body,
        propertyId: id,
        unitId,
        createdBy: user.id,
      });

      await rule.save();

      const populated = await PricingRule.findById(rule._id)
        .populate("createdBy", "firstName lastName email")
        .lean();

      return createSuccessResponse(populated, "Pricing rule created successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const PUT = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(
  async (
    user: any,
    request: NextRequest,
    { params }: { params: Promise<{ id: string; unitId: string }> }
  ) => {
    try {
      const { id, unitId } = await params;

      if (!isValidObjectId(id) || !isValidObjectId(unitId)) {
        return createErrorResponse("Invalid property or unit ID", 400);
      }

      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      if (!body.ruleId) {
        return createErrorResponse("ruleId is required", 400);
      }

      if (!isValidObjectId(body.ruleId)) {
        return createErrorResponse("Invalid rule ID", 400);
      }

      const property = await Property.findById(id).lean();
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      if (user.role === UserRole.OWNER && property.ownerId?.toString() !== user.id) {
        return createErrorResponse("You can only manage pricing for properties you own", 403);
      }

      const rule = await PricingRule.findOne({
        _id: body.ruleId,
        propertyId: id,
        unitId,
      });

      if (!rule) {
        return createErrorResponse("Pricing rule not found", 404);
      }

      if (body.ruleType && !Object.values(PricingRuleType).includes(body.ruleType)) {
        return createErrorResponse(`Invalid rule type. Must be one of: ${Object.values(PricingRuleType).join(", ")}`, 400);
      }

      const { ruleId: _ruleId, ...updateData } = body;
      delete updateData.propertyId;
      delete updateData.unitId;
      delete updateData.createdBy;

      Object.assign(rule, updateData);
      await rule.save();

      const populated = await PricingRule.findById(rule._id)
        .populate("createdBy", "firstName lastName email")
        .lean();

      return createSuccessResponse(populated, "Pricing rule updated successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);

export const DELETE = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(
  async (
    user: any,
    request: NextRequest,
    { params }: { params: Promise<{ id: string; unitId: string }> }
  ) => {
    try {
      const { id, unitId } = await params;

      if (!isValidObjectId(id) || !isValidObjectId(unitId)) {
        return createErrorResponse("Invalid property or unit ID", 400);
      }

      const { searchParams } = new URL(request.url);
      const ruleId = searchParams.get("ruleId");

      if (!ruleId || !isValidObjectId(ruleId)) {
        return createErrorResponse("Valid ruleId query parameter is required", 400);
      }

      const property = await Property.findById(id).lean();
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      if (user.role === UserRole.OWNER && property.ownerId?.toString() !== user.id) {
        return createErrorResponse("You can only manage pricing for properties you own", 403);
      }

      const rule = await PricingRule.findOneAndDelete({
        _id: ruleId,
        propertyId: id,
        unitId,
      });

      if (!rule) {
        return createErrorResponse("Pricing rule not found", 404);
      }

      return createSuccessResponse({ id: ruleId }, "Pricing rule deleted successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);
