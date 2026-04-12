export const dynamic = "force-dynamic";

import {
  createSuccessResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";
import { UserRole, LeaseStatus } from "@/types";
import { Lease, RenewalOpportunity } from "@/models";

/**
 * Upsert renewal_candidate rows for active leases expiring within 90 days.
 */
export const POST = withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(
  async () => {
    try {
      const now = new Date();
      const ninetyDaysFromNow = new Date(
        now.getTime() + 90 * 24 * 60 * 60 * 1000
      );

      const leases = await Lease.find({
        status: LeaseStatus.ACTIVE,
        deletedAt: null,
        endDate: { $gte: now, $lte: ninetyDaysFromNow },
      })
        .select("_id tenantId propertyId unitId")
        .lean();

      let created = 0;
      let skipped = 0;

      for (const lease of leases) {
        const exists = await RenewalOpportunity.findOne({
          leaseId: lease._id,
        })
          .select("_id")
          .lean();
        if (exists) {
          skipped += 1;
          continue;
        }

        await RenewalOpportunity.create({
          leaseId: lease._id,
          tenantId: lease.tenantId,
          propertyId: lease.propertyId,
          unitId: lease.unitId,
          status: "renewal_candidate",
        });
        created += 1;
      }

      return createSuccessResponse(
        {
          scanned: leases.length,
          created,
          skippedExisting: skipped,
        },
        "Renewal opportunity sync completed"
      );
    } catch (error) {
      return handleApiError(error, "Renewal sync failed");
    }
  }
);
