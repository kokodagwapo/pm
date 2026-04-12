/**
 * SmartStartPM - Leases API Routes
 * CRUD operations for lease management
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { Lease, Property, User } from "@/models";
import { UserRole, LeaseStatus } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
  parsePaginationParams,
  paginateQuery,
  parseRequestBody,
} from "@/lib/api-utils";
import {
  leaseSchema,
  paginationSchema,
  validateSchema,
} from "@/lib/validations";
import { autoInvoiceGenerationService } from "@/lib/services/auto-invoice-generation.service";

// ============================================================================
// GET /api/leases - Get all leases with pagination and filtering
// ============================================================================

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.TENANT,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const paginationParams = parsePaginationParams(searchParams);

    // Parse lease-specific filter parameters
    const status = searchParams.get("status") || undefined;
    const propertyId = searchParams.get("propertyId") || undefined;
    const unitId = searchParams.get("unitId") || undefined;
    const tenantId = searchParams.get("tenantId") || undefined;
    const expiring = searchParams.get("expiring") || undefined;

    // Validate pagination parameters
    const validation = validateSchema(paginationSchema, paginationParams);

    if (!validation.success) {
      return createErrorResponse(validation.errors.join(", "), 400);
    }

    const filters = validation.data;

    // Build query based on user role and filters
    let query: any = {};

    // Role-based filtering for single company architecture
    if (user.role === UserRole.TENANT) {
      // For tenant users, filter leases by their user ID directly
      query.tenantId = user.id;
    }
    // Admin and Manager can see all company leases - no filtering needed

    // Apply lease-specific filters
    if (status) {
      const parts = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        query.status = { $in: parts };
      } else {
        query.status = parts[0];
      }
    }
    if (propertyId) query.propertyId = propertyId;
    if (unitId) query.unitId = unitId;
    if (tenantId) query.tenantId = tenantId;

    // Handle expiring leases filter
    if (expiring) {
      const days = parseInt(expiring) || 30;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      query.status = LeaseStatus.ACTIVE;
      query.endDate = { $lte: futureDate };
    }

    // Handle search query - search across multiple fields
    // Note: For populated fields (tenant, property), we need to filter after populate
    let searchRegex: RegExp | null = null;
    if (
      filters.search &&
      typeof filters.search === "string" &&
      filters.search.trim()
    ) {
      const searchTerm = filters.search.trim();
      // Escape special regex characters for safety
      const escapedSearchTerm = searchTerm.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      searchRegex = new RegExp(escapedSearchTerm, "i");
    }

    // Execute paginated query
    const result = await paginateQuery(Lease, query, filters);

    // Populate property and tenant information
    const populatedData = await Lease.populate(result.data, [
      {
        path: "propertyId",
        select:
          "name address type bedrooms bathrooms squareFootage units isMultiUnit totalUnits",
        populate: {
          path: "ownerId",
          select: "firstName lastName email",
        },
      },
      {
        path: "tenantId",
        select:
          "firstName lastName email phone avatar dateOfBirth employmentInfo emergencyContacts creditScore backgroundCheckStatus moveInDate moveOutDate applicationDate",
      },
    ]);

    // Filter out leases with null tenants (orphaned leases), apply search, and add unit information
    const validLeases = populatedData
      .filter((lease: any) => lease.tenantId !== null)
      .filter((lease: any) => {
        // Apply search filter across populated fields if search term exists
        if (!searchRegex) return true;

        // Search across tenant fields
        const tenantFirstName = lease.tenantId?.firstName || "";
        const tenantLastName = lease.tenantId?.lastName || "";
        const tenantFullName = `${tenantFirstName} ${tenantLastName}`.trim();
        const tenantEmail = lease.tenantId?.email || "";
        const tenantPhone = lease.tenantId?.phone || "";

        // Search across property fields
        const propertyName = lease.propertyId?.name || "";
        const propertyStreet = lease.propertyId?.address?.street || "";
        const propertyCity = lease.propertyId?.address?.city || "";
        const propertyState = lease.propertyId?.address?.state || "";
        const propertyZipCode = lease.propertyId?.address?.zipCode || "";
        const fullAddress =
          `${propertyStreet} ${propertyCity} ${propertyState} ${propertyZipCode}`.trim();

        // Search across lease ID (convert to string for matching)
        const leaseId = lease._id?.toString() || "";

        // Search across notes
        const notes = lease.notes || "";

        // Check if any field matches the search term
        return (
          searchRegex.test(tenantFullName) ||
          searchRegex.test(tenantFirstName) ||
          searchRegex.test(tenantLastName) ||
          searchRegex.test(tenantEmail) ||
          searchRegex.test(tenantPhone) ||
          searchRegex.test(propertyName) ||
          searchRegex.test(fullAddress) ||
          searchRegex.test(propertyStreet) ||
          searchRegex.test(propertyCity) ||
          searchRegex.test(leaseId) ||
          searchRegex.test(notes)
        );
      })
      .map((lease: any) => {
        // Find the specific unit within the property's embedded units array
        if (lease.propertyId && lease.propertyId.units && lease.unitId) {
          const unitData = lease.propertyId.units.find(
            (u: any) => u._id && u._id.toString() === lease.unitId.toString()
          );
          if (unitData) {
            // Add unit information as a virtual property
            lease.unit = unitData;
          }
        }
        return lease;
      });

    // Update pagination count if we filtered out any leases
    const filteredPagination = {
      ...result.pagination,
      total: validLeases.length,
    };

    return createSuccessResponse(
      validLeases,
      "Leases retrieved successfully",
      filteredPagination
    );
  } catch (error) {
    return handleApiError(error);
  }
});

// ============================================================================
// POST /api/leases - Create a new lease
// ============================================================================

export const POST = withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(
  async (user, request: NextRequest) => {
    try {
      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      // Validate request body
      const validation = validateSchema(leaseSchema, body);
      if (!validation.success) {
        return createErrorResponse(validation.errors.join(", "), 400);
      }

      const leaseData = validation.data;

      // Verify property exists and unit is available
      const property = await Property.findById(leaseData.propertyId);
      if (!property) {
        return createErrorResponse("Property not found", 404);
      }

      // Verify the specific unit exists and is available
      const unit = property.units.find(
        (u: any) => u._id && u._id.toString() === leaseData.unitId.toString()
      );

      if (!unit) {
        return createErrorResponse("Unit not found in this property", 404);
      }

      if (unit.status !== "available") {
        return createErrorResponse("Unit is not available for lease", 400);
      }

      // Verify tenant exists and is approved
      const tenant = await User.findOne({
        _id: leaseData.tenantId,
        role: UserRole.TENANT,
      });
      if (!tenant) {
        return createErrorResponse("Tenant not found", 404);
      }

      // Check tenant status - tenant must be approved or active to create a lease
      if (
        !tenant.tenantStatus ||
        !["approved", "active"].includes(tenant.tenantStatus)
      ) {
        return createErrorResponse(
          "Tenant must be approved before creating a lease",
          400
        );
      }

      // Check for overlapping leases for the specific unit
      const overlappingLease = await Lease.findOne({
        propertyId: leaseData.propertyId,
        unitId: leaseData.unitId,
        status: { $in: [LeaseStatus.ACTIVE, LeaseStatus.PENDING] },
        $or: [
          {
            startDate: { $lte: leaseData.endDate },
            endDate: { $gte: leaseData.startDate },
          },
        ],
      });

      if (overlappingLease) {
        return createErrorResponse(
          "Lease dates overlap with existing lease for this unit",
          409
        );
      }

      // Create the lease
      const lease = new Lease({
        ...leaseData,
        status: leaseData.status || LeaseStatus.DRAFT,
      });
      await lease.save();

      // Update unit status if lease is active
      if (lease.status === LeaseStatus.ACTIVE) {
        await Property.updateOne(
          { _id: leaseData.propertyId, "units._id": leaseData.unitId },
          {
            $set: {
              "units.$.status": "occupied",
              "units.$.currentTenantId": leaseData.tenantId,
              "units.$.currentLeaseId": lease._id,
            },
          }
        );
      }

      // Populate property and tenant information
      await lease.populate([
        {
          path: "propertyId",
          select:
            "name address type bedrooms bathrooms squareFootage units isMultiUnit totalUnits",
        },
        {
          path: "tenantId",
          select:
            "firstName lastName email phone avatar dateOfBirth employmentInfo emergencyContacts creditScore backgroundCheckStatus moveInDate moveOutDate applicationDate",
        },
      ]);

      // Add unit information to the response from the unified property-unit model
      if (lease.propertyId && lease.propertyId.units && lease.unitId) {
        const unitInfo = lease.propertyId.units.find(
          (u: any) => u._id && u._id.toString() === lease.unitId.toString()
        );
        if (unitInfo) {
          // Add unit information as a virtual property
          (lease as any).unit = unitInfo;
        }
      }

      // Auto-generate invoices if lease is active and auto-generation is enabled
      let invoiceGenerationResult = null;

      if (
        lease.status === LeaseStatus.ACTIVE &&
        lease.terms?.paymentConfig?.autoGenerateInvoices
      ) {
        try {
          const config = {
            generateOnLeaseCreation: true,
            generateMonthlyRent: true,
            generateSecurityDeposit: lease.terms.securityDeposit > 0,
            advanceMonths: lease.terms.paymentConfig?.advancePaymentMonths || 0,
            gracePeriodDays:
              lease.terms.paymentConfig?.lateFeeConfig?.gracePeriodDays || 5,
            autoIssue: true, // Always auto-issue invoices when creating from simplified form
            autoEmail: lease.terms.paymentConfig?.autoEmailInvoices || false,
          };

          invoiceGenerationResult =
            await autoInvoiceGenerationService.generateInvoicesForLease(
              lease._id.toString(),
              config
            );
        } catch (error) {
          // Don't fail lease creation if invoice generation fails
        }
      }

      return createSuccessResponse(
        {
          lease,
          invoiceGeneration: invoiceGenerationResult,
        },
        "Lease created successfully",
        undefined
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
);

// ============================================================================
// PUT /api/leases - Bulk update leases (admin only)
// ============================================================================

export const PUT = withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      const { leaseIds, updates } = body;

      if (!Array.isArray(leaseIds) || leaseIds.length === 0) {
        return createErrorResponse("Lease IDs array is required", 400);
      }

      if (!updates || typeof updates !== "object") {
        return createErrorResponse("Updates object is required", 400);
      }

      // Remove fields that shouldn't be bulk updated
      const allowedUpdates = { ...updates };
      delete allowedUpdates._id;
      delete allowedUpdates.propertyId;
      delete allowedUpdates.tenantId;
      delete allowedUpdates.createdAt;
      delete allowedUpdates.updatedAt;

      // Perform bulk update
      const result = await Lease.updateMany(
        { _id: { $in: leaseIds } },
        { $set: allowedUpdates }
      );

      return createSuccessResponse(
        {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        },
        `${result.modifiedCount} leases updated successfully`
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
);

// ============================================================================
// DELETE /api/leases - Bulk delete leases (admin only)
// ============================================================================

export const DELETE = withRoleAndDB([UserRole.Uadmin])(
  async (user, request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const leaseIds = searchParams.get("ids")?.split(",") || [];

      if (leaseIds.length === 0) {
        return createErrorResponse("Lease IDs are required", 400);
      }

      // Check for active leases
      const activeLeases = await Lease.find({
        _id: { $in: leaseIds },
        status: LeaseStatus.ACTIVE,
      });

      if (activeLeases.length > 0) {
        return createErrorResponse(
          "Cannot delete active leases. Please terminate them first.",
          409
        );
      }

      // Perform soft delete
      const result = await Lease.updateMany(
        { _id: { $in: leaseIds } },
        { $set: { deletedAt: new Date() } }
      );

      return createSuccessResponse(
        {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        },
        `${result.modifiedCount} leases deleted successfully`
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
);
