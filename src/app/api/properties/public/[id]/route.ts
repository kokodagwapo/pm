/**
 * SmartStartPM - Public Property Detail API
 * Returns detailed property information for Heidi to provide insights
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Property } from "@/models";
import { connectDBSafe } from "@/lib/mongodb";
import { createSuccessResponse, createErrorResponse, isValidObjectId } from "@/lib/api-utils";
import { stripUnitSecretsForPublicApi } from "@/lib/unit-access-secrets";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDBSafe();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return createErrorResponse("Invalid property ID", 400);
    }

    const property = await Property.findOne({ _id: id, deletedAt: null }).lean();

    if (!property) {
      return createErrorResponse("Property not found", 404);
    }

    // Strip sensitive unit data
    if (Array.isArray((property as any).units)) {
      (property as any).units = (property as any).units.map((u: any) => 
        stripUnitSecretsForPublicApi(u)
      );
    }

    return createSuccessResponse(property, "Property retrieved successfully");
  } catch (error) {
    console.error("Public property detail API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
