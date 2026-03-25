import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import VendorJob from "@/models/VendorJob";
import Vendor from "@/models/Vendor";
import mongoose from "mongoose";

interface SessionUser {
  id: string;
  role: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const isManager = ["admin", "super_admin", "manager"].includes(user.role);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    await connectDB();
    const job = await VendorJob.findById(id)
      .populate("propertyId", "name address")
      .populate("postedBy", "firstName lastName email")
      .populate("assignedVendorId", "name contactName email phone rating")
      .lean();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Access control: manager sees all; vendor sees their own; anyone sees open marketplace jobs
    if (!isManager) {
      const isPublicOpen =
        (job as { isPublicToMarketplace?: boolean; status?: string }).isPublicToMarketplace &&
        (job as { status?: string }).status === "open";

      if (!isPublicOpen) {
        const ownVendor = await Vendor.findOne({ userId: user.id }).select("_id").lean();
        const ownVendorId = (ownVendor as { _id: { toString: () => string } } | null)?._id?.toString();
        const assignedId = (job as { assignedVendorId?: { toString: () => string } }).assignedVendorId?.toString();
        const postedById = (job as { postedBy?: { _id?: { toString: () => string }; toString?: () => string } }).postedBy;
        const posterId = typeof postedById === "object" && postedById !== null
          ? (postedById as { _id?: { toString: () => string } })._id?.toString() ?? postedById.toString?.()
          : String(postedById);

        if (ownVendorId !== assignedId && posterId !== user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("GET /api/vendors/jobs/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    await connectDB();

    const job = await VendorJob.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, ...rest } = body;

    const managerRoles = ["admin", "super_admin", "manager"];
    const isManager = managerRoles.includes(user.role);

    // Resolve the vendor profile for the current user (vendor-side auth checks)
    const sessionVendor = isManager
      ? null
      : await Vendor.findOne({ userId: user.id }).select("_id complianceHold").lean();

    const isAssignedVendor =
      sessionVendor &&
      job.assignedVendorId &&
      job.assignedVendorId.toString() === (sessionVendor as { _id: { toString: () => string } })._id.toString();

    // Actions only the assigned vendor may perform
    const vendorOnlyActions = ["accept", "decline", "en_route", "on_site", "start_work", "complete"];
    if (vendorOnlyActions.includes(action) && !isManager && !isAssignedVendor) {
      return NextResponse.json(
        { error: "Only the assigned vendor or a manager may perform this action" },
        { status: 403 }
      );
    }

    if (action === "accept") {
      if (sessionVendor && (sessionVendor as { complianceHold?: boolean }).complianceHold) {
        return NextResponse.json(
          { error: "Vendor is on compliance hold and cannot accept jobs" },
          { status: 409 }
        );
      }
      job.status = "accepted";
      if (job.dispatchLog.length > 0) {
        const lastEntry = job.dispatchLog[job.dispatchLog.length - 1];
        lastEntry.response = "accepted";
        lastEntry.respondedAt = new Date();
      }
    } else if (action === "decline") {
      if (job.dispatchLog.length > 0) {
        const lastEntry = job.dispatchLog[job.dispatchLog.length - 1];
        lastEntry.response = "declined";
        lastEntry.respondedAt = new Date();
      }
      job.assignedVendorId = undefined;
      job.assignedVendorName = undefined;
      job.status = "open";
    } else if (action === "en_route") {
      job.status = "en_route";
    } else if (action === "on_site") {
      job.status = "on_site";
    } else if (action === "start_work") {
      job.status = "work_started";
    } else if (action === "complete") {
      job.status = "completed";
      job.completedDate = new Date();
      if (rest.afterPhotos) job.afterPhotos = rest.afterPhotos;
      if (rest.beforePhotos) job.beforePhotos = rest.beforePhotos;
      if (rest.vendorNotes) job.vendorNotes = rest.vendorNotes;
      if (rest.finalCost !== undefined) job.finalCost = rest.finalCost;
    } else if (action === "approve" && isManager) {
      job.status = "approved";
      job.approvedDate = new Date();
      if (rest.managerNotes) job.managerNotes = rest.managerNotes;

      if (job.assignedVendorId && job.finalCost) {
        // Use update pipeline to safely decrement activeWorkOrders without going below 0
        await Vendor.findByIdAndUpdate(job.assignedVendorId, [
          {
            $set: {
              walletBalance: { $add: ["$walletBalance", job.finalCost] },
              pendingPayout: { $add: ["$pendingPayout", job.finalCost] },
              completedJobs: { $add: ["$completedJobs", 1] },
              activeWorkOrders: { $max: [0, { $subtract: ["$activeWorkOrders", 1] }] },
            },
          },
        ]);
      }
    } else if (action === "request_revision" && isManager) {
      job.status = "revision_requested";
      if (rest.managerNotes) job.managerNotes = rest.managerNotes;
    } else if (action === "release_payment" && isManager) {
      job.status = "payment_released";
      job.paymentReleasedDate = new Date();
      if (job.assignedVendorId) {
        await Vendor.findByIdAndUpdate(job.assignedVendorId, {
          $inc: { pendingPayout: -(job.finalCost || 0), totalEarnings: job.finalCost || 0 },
        });
      }
    } else if (action === "assign_vendor" && isManager) {
      const { vendorId } = rest;
      if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
        return NextResponse.json({ error: "Invalid vendorId" }, { status: 400 });
      }
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }
      if (vendor.complianceHold) {
        return NextResponse.json(
          {
            error: `Vendor is on compliance hold: ${vendor.complianceHoldReason || "Credentials require review"}`,
          },
          { status: 409 }
        );
      }
      job.assignedVendorId = new mongoose.Types.ObjectId(vendorId);
      job.assignedVendorName = vendor.name;
      job.status = "dispatched";
      job.dispatchLog.push({
        vendorId: vendor._id as unknown as mongoose.Types.ObjectId,
        vendorName: vendor.name,
        dispatchedAt: new Date(),
      });
      await Vendor.findByIdAndUpdate(vendorId, { $inc: { activeWorkOrders: 1 } });
    } else if (action === "submit_bid") {
      const { vendorId, amount, estimatedHours, notes: bidNotes } = rest;
      if (!vendorId || !amount) {
        return NextResponse.json(
          { error: "vendorId and amount required for bid" },
          { status: 400 }
        );
      }
      const vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      }
      // Ensure the requester owns this vendor profile (or is a manager)
      if (!isManager && vendor.userId?.toString() !== user.id) {
        return NextResponse.json(
          { error: "You can only submit bids as your own vendor profile" },
          { status: 403 }
        );
      }
      if (vendor.complianceHold) {
        return NextResponse.json(
          { error: "Vendor is on compliance hold and cannot submit bids" },
          { status: 409 }
        );
      }
      const existingBid = job.bids.find(
        (b) => b.vendorId.toString() === vendorId
      );
      if (existingBid) {
        return NextResponse.json(
          { error: "Vendor has already submitted a bid for this job" },
          { status: 409 }
        );
      }
      job.bids.push({
        vendorId: new mongoose.Types.ObjectId(vendorId),
        vendorName: vendor.name,
        amount,
        estimatedHours,
        notes: bidNotes,
        submittedAt: new Date(),
        status: "pending",
      });
    } else if (action === "accept_bid" && isManager) {
      const { bidId } = rest;
      const bid = job.bids.id(bidId);
      if (!bid) {
        return NextResponse.json({ error: "Bid not found" }, { status: 404 });
      }
      bid.status = "accepted";
      for (const b of job.bids) {
        if (b._id.toString() !== bidId) b.status = "rejected";
      }
      job.assignedVendorId = bid.vendorId;
      job.assignedVendorName = bid.vendorName;
      job.finalCost = bid.amount;
      job.status = "accepted";
      job.dispatchLog.push({
        vendorId: bid.vendorId,
        vendorName: bid.vendorName,
        dispatchedAt: new Date(),
        response: "accepted",
        respondedAt: new Date(),
      });
      await Vendor.findByIdAndUpdate(bid.vendorId, { $inc: { activeWorkOrders: 1 } });
    } else if (!isManager && !["accept", "decline", "en_route", "on_site", "start_work", "complete", "submit_bid"].includes(action)) {
      return NextResponse.json(
        { error: "Not authorized for this action" },
        { status: 403 }
      );
    } else {
      if (rest.scheduledDate !== undefined)
        job.scheduledDate = rest.scheduledDate ? new Date(rest.scheduledDate) : undefined;
      if (rest.budget !== undefined) job.budget = rest.budget;
      if (rest.managerNotes !== undefined) job.managerNotes = rest.managerNotes;
    }

    await job.save();

    const updatedJob = await VendorJob.findById(id)
      .populate("propertyId", "name address")
      .populate("assignedVendorId", "name contactName email phone rating")
      .lean();

    return NextResponse.json({ job: updatedJob });
  } catch (error) {
    console.error("PATCH /api/vendors/jobs/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
