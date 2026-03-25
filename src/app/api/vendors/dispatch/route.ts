import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import VendorJob from "@/models/VendorJob";
import mongoose from "mongoose";

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
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { jobId, category, preferredVendorId } = await request.json();

    if (!jobId || !category) {
      return NextResponse.json(
        { error: "jobId and category are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    const job = await VendorJob.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (!["open", "dispatched"].includes(job.status)) {
      return NextResponse.json(
        { error: "Job is not in a dispatchable state" },
        { status: 409 }
      );
    }

    const alreadyContacted = job.dispatchLog.map((d) => d.vendorId.toString());

    const query: Record<string, unknown> = {
      categories: category,
      isApproved: true,
      isAvailable: true,
      complianceHold: false,
      _id: { $nin: alreadyContacted.map((id) => new mongoose.Types.ObjectId(id)) },
    };

    let vendorToDispatch = null;

    if (preferredVendorId && mongoose.Types.ObjectId.isValid(preferredVendorId)) {
      const preferred = await Vendor.findOne({
        _id: preferredVendorId,
        isApproved: true,
        complianceHold: false,
      });
      if (preferred) vendorToDispatch = preferred;
    }

    if (!vendorToDispatch) {
      const candidates = await Vendor.find(query)
        .sort({ rating: -1, responseTimeHours: 1, completedJobs: -1 })
        .limit(1)
        .lean();

      if (candidates.length === 0) {
        return NextResponse.json(
          {
            error:
              "No available, verified vendors found for this category. All qualified vendors have already been contacted or none exist.",
          },
          { status: 404 }
        );
      }
      vendorToDispatch = candidates[0];
    }

    const vendorId = vendorToDispatch._id as unknown as mongoose.Types.ObjectId;

    await VendorJob.findByIdAndUpdate(jobId, {
      status: "dispatched",
      assignedVendorId: vendorId,
      assignedVendorName: vendorToDispatch.name,
      $push: {
        dispatchLog: {
          vendorId,
          vendorName: vendorToDispatch.name,
          dispatchedAt: new Date(),
        },
      },
    });

    await Vendor.findByIdAndUpdate(vendorId, {
      $inc: { activeWorkOrders: 1 },
    });

    const updatedJob = await VendorJob.findById(jobId)
      .populate("propertyId", "name address")
      .populate("assignedVendorId", "name contactName email phone rating")
      .lean();

    return NextResponse.json({
      job: updatedJob,
      dispatchedTo: {
        id: vendorToDispatch._id,
        name: vendorToDispatch.name,
        rating: vendorToDispatch.rating,
        responseTimeHours: vendorToDispatch.responseTimeHours,
      },
    });
  } catch (error) {
    console.error("POST /api/vendors/dispatch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
