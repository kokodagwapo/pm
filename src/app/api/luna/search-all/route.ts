import { NextRequest, NextResponse } from "next/server";
import { Property } from "@/models";
import { createSuccessResponse, handleApiError, withRoleAndDB } from "@/lib/api-utils";
import { UserRole } from "@/types";

export const dynamic = "force-dynamic";

export const GET = withRoleAndDB([UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN])(
  async (
    _user: { id: string; email: string; role: UserRole; isActive: boolean },
    request: NextRequest
  ) => {
    try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Search across name, description, address, and neighborhood
    const properties = await Property.find({
      deletedAt: null,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { "address.street": { $regex: query, $options: "i" } },
        { "address.city": { $regex: query, $options: "i" } },
        { neighborhood: { $regex: query, $options: "i" } },
      ],
    })
    .select("-__v")
    .limit(10)
    .lean();

    return createSuccessResponse(properties, "Search results retrieved");
    } catch (error) {
      return handleApiError(error);
    }
  }
);
