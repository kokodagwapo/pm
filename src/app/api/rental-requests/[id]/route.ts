export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { Property, RentalRequest } from "@/models";
import { UserRole, RentalRequestStatus, LeaseStatus } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
  isValidObjectId,
  getOwnerPropertyAccess,
} from "@/lib/api-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) {
      return createErrorResponse("Authentication required", 401);
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return createErrorResponse("Invalid rental request ID", 400);
    }

    const user = session.user;
    const userRole = (user.role as UserRole) || UserRole.TENANT;

    const rentalRequest = await RentalRequest.findById(id)
      .populate("propertyId", "name address images units")
      .populate("tenantId", "firstName lastName email phone")
      .populate("respondedBy", "firstName lastName email")
      .populate("approvedLeaseId")
      .lean();

    if (!rentalRequest) {
      return createErrorResponse("Rental request not found", 404);
    }

    if (userRole === UserRole.TENANT) {
      if ((rentalRequest.tenantId as any)?._id?.toString() !== user.id &&
          rentalRequest.tenantId?.toString() !== user.id) {
        return createErrorResponse("Access denied", 403);
      }
    } else if (userRole === UserRole.OWNER) {
      const ownerAccess = await getOwnerPropertyAccess(user.id);
      const propId = (rentalRequest.propertyId as any)?._id?.toString() ||
                     rentalRequest.propertyId?.toString();
      if (!ownerAccess.ownedPropertyIds.includes(propId)) {
        return createErrorResponse("Access denied", 403);
      }
    }

    return createSuccessResponse(
      { request: rentalRequest },
      "Rental request details fetched successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) {
      return createErrorResponse("Authentication required", 401);
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return createErrorResponse("Invalid rental request ID", 400);
    }

    const user = session.user;
    const userRole = (user.role as UserRole) || UserRole.TENANT;

    if (![UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER].includes(userRole)) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const parsed = await parseRequestBody(request);
    if (!parsed.success) {
      return createErrorResponse(parsed.error || "Invalid request body", 400);
    }

    const { action, adminResponse, autoCreateLease } = parsed.data;

    if (!action || !["approve", "reject"].includes(action)) {
      return createErrorResponse("Invalid action. Must be 'approve' or 'reject'", 400);
    }

    const rentalRequest = await RentalRequest.findById(id);
    if (!rentalRequest) {
      return createErrorResponse("Rental request not found", 404);
    }

    if (rentalRequest.status !== RentalRequestStatus.PENDING) {
      return createErrorResponse(
        `Cannot ${action} a request with status '${rentalRequest.status}'`,
        400
      );
    }

    if (userRole === UserRole.OWNER) {
      const ownerAccess = await getOwnerPropertyAccess(user.id);
      if (!ownerAccess.ownedPropertyIds.includes(rentalRequest.propertyId.toString())) {
        return createErrorResponse("Access denied", 403);
      }
    }

    if (action === "approve") {
      rentalRequest.status = RentalRequestStatus.APPROVED;
      rentalRequest.adminResponse = adminResponse || undefined;
      rentalRequest.respondedBy = user.id as any;
      rentalRequest.respondedAt = new Date();

      if (autoCreateLease) {
        try {
          const Lease = (await import("@/models/Lease")).default;
          const property = await Property.findById(rentalRequest.propertyId);

          if (property) {
            const unit = property.units.find(
              (u: any) => u._id && u._id.toString() === rentalRequest.unitId.toString()
            );

            if (unit) {
              const lease = new Lease({
                propertyId: rentalRequest.propertyId,
                unitId: rentalRequest.unitId,
                tenantId: rentalRequest.tenantId,
                startDate: rentalRequest.requestedStartDate,
                endDate: rentalRequest.requestedEndDate,
                status: LeaseStatus.DRAFT,
                terms: {
                  rentAmount: unit.rentAmount,
                  securityDeposit: unit.securityDeposit,
                  lateFee: 50,
                  utilities: [],
                  restrictions: [],
                },
                notes: `Auto-created from rental request. Calculated price: $${rentalRequest.calculatedPrice}`,
              });

              await lease.save();
              rentalRequest.approvedLeaseId = lease._id;
            }
          }
        } catch (leaseError) {
          console.error("Failed to auto-create lease:", leaseError);
        }
      }
    } else if (action === "reject") {
      rentalRequest.status = RentalRequestStatus.REJECTED;
      rentalRequest.adminResponse = adminResponse || undefined;
      rentalRequest.respondedBy = user.id as any;
      rentalRequest.respondedAt = new Date();
    }

    await rentalRequest.save();

    const populated = await RentalRequest.findById(id)
      .populate("propertyId", "name address images")
      .populate("tenantId", "firstName lastName email phone")
      .populate("respondedBy", "firstName lastName email")
      .populate("approvedLeaseId")
      .lean();

    return createSuccessResponse(
      { request: populated },
      `Rental request ${action}d successfully`
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const session = await auth();
    if (!session?.user) {
      return createErrorResponse("Authentication required", 401);
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return createErrorResponse("Invalid rental request ID", 400);
    }

    const user = session.user;
    const userRole = (user.role as UserRole) || UserRole.TENANT;

    const rentalRequest = await RentalRequest.findById(id);
    if (!rentalRequest) {
      return createErrorResponse("Rental request not found", 404);
    }

    if (userRole === UserRole.TENANT) {
      if (rentalRequest.tenantId.toString() !== user.id) {
        return createErrorResponse("Access denied", 403);
      }
      if (rentalRequest.status !== RentalRequestStatus.PENDING) {
        return createErrorResponse("Can only cancel pending requests", 400);
      }
      rentalRequest.status = RentalRequestStatus.CANCELLED;
      await rentalRequest.save();
    } else if ([UserRole.ADMIN, UserRole.MANAGER].includes(userRole)) {
      await RentalRequest.findByIdAndDelete(id);
    } else if (userRole === UserRole.OWNER) {
      const ownerAccess = await getOwnerPropertyAccess(user.id);
      if (!ownerAccess.ownedPropertyIds.includes(rentalRequest.propertyId.toString())) {
        return createErrorResponse("Access denied", 403);
      }
      await RentalRequest.findByIdAndDelete(id);
    } else {
      return createErrorResponse("Insufficient permissions", 403);
    }

    return createSuccessResponse(
      null,
      "Rental request cancelled/deleted successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
