export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Review from "@/models/Review";
import connectDB from "@/lib/mongodb";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
  isValidObjectId,
} from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId || !isValidObjectId(propertyId)) {
      return createErrorResponse("Valid propertyId is required", 400);
    }

    const reviews = await Review.find({ propertyId, approved: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const total = reviews.length;
    const avgRating = total > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10
      : 0;

    const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));

    return createSuccessResponse(
      { reviews, total, avgRating, ratingBreakdown },
      "Reviews fetched"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { success, data: body, error } = await parseRequestBody(request);
    if (!success) return createErrorResponse(error!, 400);

    const { propertyId, guestName, guestEmail, rating, title, body: reviewBody, stayMonth } = body;

    if (!propertyId || !isValidObjectId(propertyId)) {
      return createErrorResponse("Valid propertyId is required", 400);
    }
    if (!guestName?.trim()) return createErrorResponse("Name is required", 400);
    if (!guestEmail?.trim() || !guestEmail.includes("@")) {
      return createErrorResponse("Valid email is required", 400);
    }
    if (!rating || rating < 1 || rating > 5) {
      return createErrorResponse("Rating must be 1-5", 400);
    }
    if (!title?.trim()) return createErrorResponse("Review title is required", 400);
    if (!reviewBody?.trim() || reviewBody.trim().length < 20) {
      return createErrorResponse("Review must be at least 20 characters", 400);
    }

    const recentDupe = await Review.findOne({
      propertyId,
      guestEmail: guestEmail.toLowerCase().trim(),
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    if (recentDupe) {
      return createErrorResponse("You've already submitted a review for this property recently", 409);
    }

    const review = await Review.create({
      propertyId,
      guestName: guestName.trim(),
      guestEmail: guestEmail.toLowerCase().trim(),
      rating: Number(rating),
      title: title.trim(),
      body: reviewBody.trim(),
      stayMonth: stayMonth?.trim(),
      approved: false,
    });

    return createSuccessResponse(
      { reviewId: review._id.toString() },
      "Review submitted successfully. It will appear after moderation.",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
