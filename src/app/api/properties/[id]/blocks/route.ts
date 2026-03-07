export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { UserRole, DateBlockType, LeaseStatus } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
  parseRequestBody,
  isValidObjectId,
} from "@/lib/api-utils";
import DateBlock from "@/models/DateBlock";
import { Property, Lease } from "@/models";
import { AuditService } from "@/lib/audit-service";

const auditService = new AuditService();

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
  UserRole.TENANT,
])(
  async (
    user: any,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: propertyId } = await params;

      if (!isValidObjectId(propertyId)) {
        return createErrorResponse("Invalid property ID", 400);
      }

      const property = await Property.findById(propertyId).select("units._id ownerId");
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      if (user.role === UserRole.OWNER && property.ownerId?.toString() !== user.id) {
        return createErrorResponse("You can only view blocks for properties you own", 403);
      }

      if (user.role === UserRole.TENANT) {
        const fullProperty = await Property.findById(propertyId).select("status isPublished");
        if (!fullProperty || (fullProperty as any).status === 'draft' || (fullProperty as any).isPublished === false) {
          return createErrorResponse("Property not found", 404);
        }
      }

      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const unitId = searchParams.get("unitId");
      const blockType = searchParams.get("blockType");

      const query: any = {
        propertyId,
        isActive: true,
      };

      if (unitId) {
        if (!isValidObjectId(unitId)) {
          return createErrorResponse("Invalid unit ID filter", 400);
        }
        query.unitId = unitId;
      }

      if (blockType && Object.values(DateBlockType).includes(blockType as DateBlockType)) {
        query.blockType = blockType;
      }

      if (startDate && endDate) {
        query.startDate = { $lte: new Date(endDate) };
        query.endDate = { $gte: new Date(startDate) };
      } else if (startDate) {
        query.endDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        query.startDate = { $lte: new Date(endDate) };
      }

      const blocks = await DateBlock.find(query)
        .populate("blockedBy", "firstName lastName email")
        .sort({ startDate: 1 })
        .lean();

      const safeBlocks = user.role === UserRole.TENANT
        ? blocks.map((block: any) => ({
            _id: block._id,
            propertyId: block.propertyId,
            unitId: block.unitId,
            startDate: block.startDate,
            endDate: block.endDate,
            blockType: block.blockType,
          }))
        : blocks;

      return createSuccessResponse(safeBlocks, "Property blocks retrieved successfully");
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
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id: propertyId } = await params;

      if (!isValidObjectId(propertyId)) {
        return createErrorResponse("Invalid property ID", 400);
      }

      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      const property = await Property.findById(propertyId).select("units._id ownerId");
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      if (user.role === UserRole.OWNER && property.ownerId?.toString() !== user.id) {
        return createErrorResponse("You can only block units on properties you own", 403);
      }

      if (!property.units || property.units.length === 0) {
        return createErrorResponse("Property has no units to block", 400);
      }

      const { startDate, endDate, blockType, isHardBlock, reason, recurring } = body;

      if (!startDate || !endDate) {
        return createErrorResponse("Start date and end date are required", 400);
      }

      if (!blockType || !Object.values(DateBlockType).includes(blockType)) {
        return createErrorResponse("Valid block type is required", 400);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return createErrorResponse("Invalid date format", 400);
      }

      if (start >= end) {
        return createErrorResponse("End date must be after start date", 400);
      }

      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      if (end > twoYearsFromNow) {
        return createErrorResponse("Cannot block dates more than 2 years in advance", 400);
      }

      const unitIds = property.units.map((u: any) => u._id);

      const overlappingLeases = await Lease.find({
        propertyId,
        unitId: { $in: unitIds },
        status: { $in: [LeaseStatus.ACTIVE, LeaseStatus.PENDING] },
        startDate: { $lt: end },
        endDate: { $gt: start },
        deletedAt: null,
      });

      const blockedUnitIds = new Set(
        overlappingLeases.map((l: any) => l.unitId.toString())
      );
      const availableUnits = unitIds.filter(
        (uid: any) => !blockedUnitIds.has(uid.toString())
      );

      if (availableUnits.length === 0) {
        return createErrorResponse(
          "All units have active or pending leases in the requested date range",
          409
        );
      }

      const canOverride = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;

      const existingBlocks = await DateBlock.find({
        propertyId,
        unitId: { $in: availableUnits },
        isActive: true,
        startDate: { $lt: end },
        endDate: { $gt: start },
      });

      if (existingBlocks.length > 0 && canOverride) {
        await DateBlock.updateMany(
          { _id: { $in: existingBlocks.map((b: any) => b._id) } },
          {
            isActive: false,
            cancelledAt: new Date(),
            cancelledBy: user.id,
          }
        );
      } else if (existingBlocks.length > 0 && user.role === UserRole.OWNER) {
        const hasAdminBlocks = existingBlocks.some(
          (b: any) => b.blockedByRole === "admin" || b.blockedByRole === "manager"
        );
        if (hasAdminBlocks) {
          return createErrorResponse(
            "Some units have blocks created by administrators that cannot be overridden",
            409
          );
        }
        const ownerOverridable = existingBlocks.filter(
          (b: any) => !b.isHardBlock
        );
        if (ownerOverridable.length < existingBlocks.length) {
          return createErrorResponse(
            "Some units have hard blocks that cannot be overridden",
            409
          );
        }
        await DateBlock.updateMany(
          { _id: { $in: ownerOverridable.map((b: any) => b._id) } },
          {
            isActive: false,
            cancelledAt: new Date(),
            cancelledBy: user.id,
          }
        );
      }

      const blocksToCreate = availableUnits.map((uid: any) => ({
        propertyId,
        unitId: uid,
        startDate: start,
        endDate: end,
        blockType,
        isHardBlock: isHardBlock || false,
        reason: reason || "",
        blockedBy: user.id,
        blockedByRole: user.role,
        recurring: recurring || { enabled: false, frequency: "yearly" },
      }));

      const createdBlocks = await DateBlock.insertMany(blocksToCreate);

      try {
        await auditService.logEvent(
          {
            category: "property_management" as any,
            action: "bulk_create" as any,
            severity: "medium" as any,
            description: `Bulk date block created for ${availableUnits.length} units on property ${propertyId}`,
            resourceType: "DateBlock",
            resourceId: propertyId,
            details: {
              propertyId,
              blockType,
              startDate: start.toISOString(),
              endDate: end.toISOString(),
              unitsBlocked: availableUnits.length,
              unitsSkipped: blockedUnitIds.size,
              isHardBlock: isHardBlock || false,
            },
          },
          {
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
          }
        );
      } catch {
      }

      return createSuccessResponse(
        {
          blocks: createdBlocks,
          summary: {
            totalUnits: unitIds.length,
            unitsBlocked: availableUnits.length,
            unitsSkipped: blockedUnitIds.size,
            skippedReason: blockedUnitIds.size > 0 ? "Active or pending leases" : null,
          },
        },
        `Date blocks created for ${availableUnits.length} of ${unitIds.length} units`
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
);
