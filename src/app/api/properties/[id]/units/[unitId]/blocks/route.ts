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
    { params }: { params: Promise<{ id: string; unitId: string }> }
  ) => {
    try {
      const { id: propertyId, unitId } = await params;

      if (!isValidObjectId(propertyId) || !isValidObjectId(unitId)) {
        return createErrorResponse("Invalid property or unit ID", 400);
      }

      const property = await Property.findById(propertyId).select("units._id ownerId");
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      const unitExists = property.units.some(
        (u: any) => u._id.toString() === unitId
      );
      if (!unitExists) {
        return createErrorResponse("Unit not found", 404);
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

      const query: any = {
        propertyId,
        unitId,
        isActive: true,
      };

      if (startDate || endDate) {
        query.$or = [];
        if (startDate && endDate) {
          query.$or.push({
            startDate: { $lte: new Date(endDate) },
            endDate: { $gte: new Date(startDate) },
          });
        } else if (startDate) {
          query.endDate = { $gte: new Date(startDate) };
        } else if (endDate) {
          query.startDate = { $lte: new Date(endDate) };
        }
        if (query.$or.length === 0) delete query.$or;
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

      return createSuccessResponse(safeBlocks, "Blocks retrieved successfully");
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
      const { id: propertyId, unitId } = await params;

      if (!isValidObjectId(propertyId) || !isValidObjectId(unitId)) {
        return createErrorResponse("Invalid property or unit ID", 400);
      }

      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      const property = await Property.findById(propertyId).select("units._id ownerId");
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      const unitExists = property.units.some(
        (u: any) => u._id.toString() === unitId
      );
      if (!unitExists) {
        return createErrorResponse("Unit not found", 404);
      }

      if (user.role === UserRole.OWNER && property.ownerId?.toString() !== user.id) {
        return createErrorResponse("You can only block units on properties you own", 403);
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

      const overlappingLeases = await Lease.find({
        propertyId,
        unitId,
        status: { $in: [LeaseStatus.ACTIVE, LeaseStatus.PENDING] },
        startDate: { $lt: end },
        endDate: { $gt: start },
        deletedAt: null,
      });

      if (overlappingLeases.length > 0) {
        return createErrorResponse(
          "Cannot block dates that overlap with active or pending leases",
          409
        );
      }

      const overlappingBlocks = await DateBlock.find({
        propertyId,
        unitId,
        isActive: true,
        startDate: { $lt: end },
        endDate: { $gt: start },
      });

      if (overlappingBlocks.length > 0) {
        const canOverride = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
        const hasHardBlocks = overlappingBlocks.some((b: any) => b.isHardBlock);
        const hasAdminBlocks = overlappingBlocks.some(
          (b: any) => b.blockedByRole === "admin" || b.blockedByRole === "manager"
        );

        if (hasHardBlocks && !canOverride) {
          return createErrorResponse(
            "Cannot override hard blocks. Contact an administrator.",
            409
          );
        }

        if (user.role === UserRole.OWNER && hasAdminBlocks) {
          return createErrorResponse(
            "Cannot override blocks created by administrators or managers",
            409
          );
        }

        if (canOverride) {
          await DateBlock.updateMany(
            {
              _id: { $in: overlappingBlocks.map((b: any) => b._id) },
            },
            {
              isActive: false,
              cancelledAt: new Date(),
              cancelledBy: user.id,
            }
          );
        } else {
          return createErrorResponse(
            "Date range overlaps with existing blocks",
            409
          );
        }
      }

      const dateBlock = new DateBlock({
        propertyId,
        unitId,
        startDate: start,
        endDate: end,
        blockType,
        isHardBlock: isHardBlock || false,
        reason: reason || "",
        blockedBy: user.id,
        blockedByRole: user.role,
        recurring: recurring || { enabled: false, frequency: "yearly" },
      });

      await dateBlock.save();
      await dateBlock.populate("blockedBy", "firstName lastName email");

      try {
        await auditService.logEvent(
          {
            category: "property_management" as any,
            action: "create" as any,
            severity: "medium" as any,
            description: `Date block created for unit ${unitId} on property ${propertyId}`,
            resourceType: "DateBlock",
            resourceId: dateBlock._id.toString(),
            details: {
              propertyId,
              unitId,
              blockType,
              startDate: start.toISOString(),
              endDate: end.toISOString(),
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

      return createSuccessResponse(dateBlock, "Date block created successfully");
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
      const { id: propertyId, unitId } = await params;

      if (!isValidObjectId(propertyId) || !isValidObjectId(unitId)) {
        return createErrorResponse("Invalid property or unit ID", 400);
      }

      const { searchParams } = new URL(request.url);
      const blockId = searchParams.get("blockId");

      if (!blockId || !isValidObjectId(blockId)) {
        return createErrorResponse("Valid blockId query parameter is required", 400);
      }

      const block = await DateBlock.findOne({
        _id: blockId,
        propertyId,
        unitId,
        isActive: true,
      });

      if (!block) {
        return createErrorResponse("Block not found", 404);
      }

      if (user.role === UserRole.OWNER) {
        const property = await Property.findById(propertyId).select("ownerId");
        if (!property || property.ownerId?.toString() !== user.id) {
          return createErrorResponse("You can only delete blocks on properties you own", 403);
        }

        if (block.blockedByRole === "admin" || block.blockedByRole === "manager") {
          return createErrorResponse(
            "Cannot delete blocks created by administrators or managers",
            403
          );
        }
      }

      block.isActive = false;
      block.cancelledAt = new Date();
      block.cancelledBy = user.id;
      await block.save();

      try {
        await auditService.logEvent(
          {
            category: "property_management" as any,
            action: "delete" as any,
            severity: "medium" as any,
            description: `Date block deleted for unit ${unitId} on property ${propertyId}`,
            resourceType: "DateBlock",
            resourceId: blockId,
            details: {
              propertyId,
              unitId,
              blockType: block.blockType,
              startDate: block.startDate.toISOString(),
              endDate: block.endDate.toISOString(),
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

      return createSuccessResponse({ id: blockId }, "Date block deleted successfully");
    } catch (error) {
      return handleApiError(error);
    }
  }
);
