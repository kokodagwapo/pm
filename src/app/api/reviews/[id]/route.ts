export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import Review from "@/models/Review";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  isValidObjectId,
} from "@/lib/api-utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return createErrorResponse("Unauthorized", 401);
    if (!["admin", "manager"].includes((session.user as any).role)) {
      return createErrorResponse("Forbidden", 403);
    }

    await connectDB();
    const { id } = await params;
    if (!isValidObjectId(id)) return createErrorResponse("Invalid review ID", 400);

    const body = await request.json();
    const { action } = body;

    if (!["approve", "reject"].includes(action)) {
      return createErrorResponse("Action must be 'approve' or 'reject'", 400);
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { approved: action === "approve" },
      { new: true }
    );
    if (!review) return createErrorResponse("Review not found", 404);

    return createSuccessResponse(review, `Review ${action}d`);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return createErrorResponse("Unauthorized", 401);
    if ((session.user as any).role !== "admin") return createErrorResponse("Forbidden", 403);

    await connectDB();
    const { id } = await params;
    if (!isValidObjectId(id)) return createErrorResponse("Invalid review ID", 400);

    await Review.findByIdAndDelete(id);
    return createSuccessResponse(null, "Review deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
