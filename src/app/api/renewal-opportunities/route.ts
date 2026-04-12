export const dynamic = "force-dynamic";

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
import { UserRole, LeaseStatus } from "@/types";
import { RenewalOpportunity, Lease } from "@/models";
import { RENEWAL_OPPORTUNITY_STATUSES } from "@/models/RenewalOpportunity";

const createSchema = z.object({
  leaseId: z.string().min(1),
  notes: z.string().max(8000).optional(),
  status: z.enum(RENEWAL_OPPORTUNITY_STATUSES).optional(),
});

export const GET = withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(
  async (_user) => {
    try {
      const opportunities = await RenewalOpportunity.find()
        .populate("leaseId", "endDate startDate status rentAmount")
        .populate("tenantId", "firstName lastName email")
        .populate("propertyId", "name address isMultiUnit")
        .sort({ nextContactAt: 1, updatedAt: -1 })
        .limit(300)
        .lean();

      return createSuccessResponse(
        { opportunities },
        "Renewal opportunities loaded"
      );
    } catch (error) {
      return handleApiError(error, "Failed to load renewal opportunities");
    }
  }
);

export const POST = withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(
  async (user, request: NextRequest) => {
    try {
      const body = await parseRequestBody(request);
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return createErrorResponse(parsed.error.message, 400);
      }
      const { leaseId, notes, status } = parsed.data;
      if (!isValidObjectId(leaseId)) {
        return createErrorResponse("Invalid lease id", 400);
      }

      const lease = await Lease.findOne({
        _id: leaseId,
        deletedAt: null,
      })
        .select("tenantId propertyId unitId status")
        .lean();

      if (!lease) {
        return createErrorResponse("Lease not found", 404);
      }
      if (lease.status !== LeaseStatus.ACTIVE) {
        return createErrorResponse("Only active leases can be tracked", 400);
      }

      const existing = await RenewalOpportunity.findOne({ leaseId }).lean();
      if (existing) {
        return createErrorResponse(
          "Renewal opportunity already exists for this lease",
          409
        );
      }

      const doc = await RenewalOpportunity.create({
        leaseId,
        tenantId: lease.tenantId,
        propertyId: lease.propertyId,
        unitId: lease.unitId,
        notes: notes ?? "",
        status: status ?? "renewal_candidate",
        createdBy: user.id,
      });

      const populated = await RenewalOpportunity.findById(doc._id)
        .populate("leaseId", "endDate startDate status rentAmount")
        .populate("tenantId", "firstName lastName email")
        .populate("propertyId", "name address")
        .lean();

      return createSuccessResponse(
        { opportunity: populated },
        "Renewal opportunity created"
      );
    } catch (error) {
      return handleApiError(error, "Failed to create renewal opportunity");
    }
  }
);
