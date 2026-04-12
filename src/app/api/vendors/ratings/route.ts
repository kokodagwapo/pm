export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import VendorJob from "@/models/VendorJob";
import mongoose from "mongoose";
import Lease from "@/models/Lease";

interface SessionUser {
  id: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    await connectDB();

    const { jobId, rating, comment, ratingType } = await request.json();

    if (!jobId || !rating || !ratingType) {
      return NextResponse.json(
        { error: "jobId, rating, and ratingType are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!["manager", "tenant"].includes(ratingType)) {
      return NextResponse.json(
        { error: "ratingType must be 'manager' or 'tenant'" },
        { status: 400 }
      );
    }

    const job = await VendorJob.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!["approved", "payment_released"].includes(job.status)) {
      return NextResponse.json(
        { error: "Job must be approved before rating" },
        { status: 409 }
      );
    }

    if (!job.assignedVendorId) {
      return NextResponse.json(
        { error: "No vendor assigned to this job" },
        { status: 409 }
      );
    }

    if (ratingType === "manager") {
      if (!["admin", "super_admin", "manager"].includes(user.role)) {
        return NextResponse.json(
          { error: "Only managers can submit manager ratings" },
          { status: 403 }
        );
      }
      job.vendorRating = rating;
      if (comment) job.vendorRatingComment = comment;
    } else {
      // Tenant ratings: verify the rater has an active lease for the job's property
      if (!job.propertyId) {
        return NextResponse.json({ error: "Job has no associated property" }, { status: 409 });
      }
      const activeLease = await Lease.findOne({
        tenantId: user.id,
        propertyId: job.propertyId,
        status: "active",
      }).select("_id").lean();
      if (!activeLease) {
        return NextResponse.json(
          { error: "You must be an active tenant of this property to rate the vendor" },
          { status: 403 }
        );
      }
      job.tenantRating = rating;
      if (comment) job.tenantRatingComment = comment;
    }

    await job.save();

    const vendor = await Vendor.findById(job.assignedVendorId);
    if (vendor) {
      const jobsWithRatings = await VendorJob.find({
        assignedVendorId: job.assignedVendorId,
        vendorRating: { $exists: true, $ne: null },
      }).select("vendorRating");

      const totalRatings = jobsWithRatings.length;
      const avgRating =
        totalRatings > 0
          ? jobsWithRatings.reduce((sum, j) => sum + (j.vendorRating || 0), 0) /
            totalRatings
          : 0;

      vendor.rating = Math.round(avgRating * 10) / 10;
      vendor.totalRatings = totalRatings;
      await vendor.save();
    }

    return NextResponse.json({ message: "Rating submitted successfully", job });
  } catch (error) {
    console.error("POST /api/vendors/ratings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
