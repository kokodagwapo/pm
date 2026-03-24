import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
  withRoleAndDB,
  isValidObjectId,
} from "@/lib/api-utils";
import { UserRole } from "@/types";
import { RenewalOpportunity } from "@/models";
import { RENEWAL_OPPORTUNITY_STATUSES } from "@/models/RenewalOpportunity";

const patchSchema = z.object({
  status: z.enum(RENEWAL_OPPORTUNITY_STATUSES).optional(),
  notes: z.string().max(8000).optional(),
  nextContactAt: z.union([z.string(), z.null()]).optional(),
  lastContactAt: z.union([z.string(), z.null()]).optional(),
});

export const PATCH = withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(
  async (
    _user,
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params;
      if (!isValidObjectId(id)) {
        return createErrorResponse("Invalid id", 400);
      }

      const body = await parseRequestBody(request);
      const parsed = patchSchema.safeParse(body);
      if (!parsed.success) {
        return createErrorResponse(parsed.error.message, 400);
      }

      const update: Record<string, unknown> = {};
      if (parsed.data.status !== undefined) update.status = parsed.data.status;
      if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;
      if (parsed.data.nextContactAt !== undefined) {
        const v = parsed.data.nextContactAt;
        update.nextContactAt =
          v === null || v === "" ? null : new Date(v);
      }
      if (parsed.data.lastContactAt !== undefined) {
        const v = parsed.data.lastContactAt;
        update.lastContactAt =
          v === null || v === "" ? null : new Date(v);
      }

      if (Object.keys(update).length === 0) {
        return createErrorResponse("No valid fields to update", 400);
      }

      const opportunity = await RenewalOpportunity.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
      )
        .populate("leaseId", "endDate startDate status rentAmount")
        .populate("tenantId", "firstName lastName email")
        .populate("propertyId", "name address")
        .lean();

      if (!opportunity) {
        return createErrorResponse("Renewal opportunity not found", 404);
      }

      return createSuccessResponse(
        { opportunity },
        "Renewal opportunity updated"
      );
    } catch (error) {
      return handleApiError(error, "Failed to update renewal opportunity");
    }
  }
);
