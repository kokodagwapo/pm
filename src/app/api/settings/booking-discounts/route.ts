export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import connectDB, { connectDBSafe } from "@/lib/mongodb";
import SystemSettings from "@/models/SystemSettings";
import { UserRole } from "@/types";
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  parseRequestBody,
} from "@/lib/api-utils";
import {
  DEFAULT_BOOKING_DISCOUNTS,
  normalizeBookingDiscountSettings,
} from "@/lib/booking-discounts";

const BOOKING_DISCOUNTS_CATEGORY = "payment";
const BOOKING_DISCOUNTS_KEY = "bookingBulkDiscounts";

async function loadBookingDiscountSettings() {
  const raw = await SystemSettings.getSettingValue(
    BOOKING_DISCOUNTS_CATEGORY,
    BOOKING_DISCOUNTS_KEY,
    DEFAULT_BOOKING_DISCOUNTS
  );
  return normalizeBookingDiscountSettings(raw);
}

export async function GET() {
  try {
    await connectDBSafe();
    const settings = await loadBookingDiscountSettings();

    return createSuccessResponse(
      { settings },
      "Booking discount settings retrieved successfully"
    );
  } catch (error) {
    return createSuccessResponse(
      { settings: DEFAULT_BOOKING_DISCOUNTS },
      "Booking discount settings unavailable, using defaults"
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const session = await auth();

    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const allowedRoles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER];
    const userRole = session.user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const { success, data, error } = await parseRequestBody(request);
    if (!success) {
      return createErrorResponse(error || "Invalid request body", 400);
    }

    const settings = normalizeBookingDiscountSettings(data?.settings);

    const saved = await SystemSettings.setSetting(
      BOOKING_DISCOUNTS_CATEGORY,
      BOOKING_DISCOUNTS_KEY,
      settings,
      session.user.id,
      {
        dataType: "object",
        description:
          "Default public booking discounts for weekly, monthly, and bi-monthly stays.",
        isPublic: true,
        isEditable: true,
        metadata: {
          group: "booking",
          order: 10,
          helpText:
            "Used on public pricing pages and as fallback discounts when property-specific long-stay rules are not configured.",
          icon: "percent",
          tags: ["pricing", "discounts", "booking", "stays"],
        },
      }
    );

    return createSuccessResponse(
      { settings: saved?.value ?? settings },
      "Booking discount settings updated successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
