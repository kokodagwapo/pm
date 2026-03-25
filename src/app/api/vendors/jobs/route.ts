import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import VendorJob from "@/models/VendorJob";
import Vendor from "@/models/Vendor";
import Property from "@/models/Property";
import mongoose from "mongoose";

interface SessionUser {
  id: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const isManager = ["admin", "super_admin", "manager"].includes(user.role);

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const propertyId = searchParams.get("propertyId");
    const vendorId = searchParams.get("vendorId");
    const marketplace = searchParams.get("marketplace");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const query: Record<string, unknown> = {};

    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId))
      query.propertyId = new mongoose.Types.ObjectId(propertyId);
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId))
      query.assignedVendorId = new mongoose.Types.ObjectId(vendorId);

    if (marketplace === "true") {
      // Public marketplace: any authenticated user can browse open public jobs
      query.isPublicToMarketplace = true;
      query.status = "open";
    } else if (!isManager) {
      // Non-managers: can only see their own vendor's assigned jobs or public marketplace jobs
      const ownVendor = await Vendor.findOne({ userId: user.id }).select("_id").lean();
      if (ownVendor) {
        const ownVendorId = (ownVendor as { _id: { toString: () => string } })._id;
        query.$or = [
          { assignedVendorId: ownVendorId },
          { isPublicToMarketplace: true, status: "open" },
        ];
      } else {
        // No vendor profile → can only see public marketplace
        query.isPublicToMarketplace = true;
        query.status = "open";
      }
    }

    const total = await VendorJob.countDocuments(query);
    const jobs = await VendorJob.find(query)
      .populate("propertyId", "name address")
      .populate("postedBy", "firstName lastName email")
      .populate("assignedVendorId", "name contactName email rating")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ jobs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET /api/vendors/jobs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const allowedRoles = ["admin", "super_admin", "manager"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    const {
      title,
      description,
      category,
      priority,
      propertyId,
      maintenanceRequestId,
      budget,
      scheduledDate,
      isInstantDispatch,
      isPublicToMarketplace,
      managerNotes,
    } = body;

    if (!title || !description || !category || !propertyId) {
      return NextResponse.json(
        { error: "title, description, category, and propertyId are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
    }

    const property = await Property.findById(propertyId).select("name address").lean();
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const addr = (property as { address?: { street?: string; city?: string; state?: string } }).address;
    const propertyAddress = addr
      ? `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""}`.trim().replace(/^,|,$/g, "")
      : "";

    const job = new VendorJob({
      title,
      description,
      category,
      priority: priority || "medium",
      propertyId: new mongoose.Types.ObjectId(propertyId),
      propertyAddress,
      maintenanceRequestId: maintenanceRequestId
        ? new mongoose.Types.ObjectId(maintenanceRequestId)
        : undefined,
      postedBy: new mongoose.Types.ObjectId(user.id),
      budget,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      isInstantDispatch: isInstantDispatch || false,
      isPublicToMarketplace: isPublicToMarketplace !== false,
      managerNotes,
    });

    await job.save();

    if (isInstantDispatch) {
      const topVendors = await Vendor.find({
        categories: category,
        isApproved: true,
        isAvailable: true,
        complianceHold: false,
      })
        .sort({ rating: -1, responseTimeHours: 1 })
        .limit(1)
        .lean();

      if (topVendors.length > 0) {
        const topVendor = topVendors[0];
        await VendorJob.findByIdAndUpdate(job._id, {
          status: "dispatched",
          assignedVendorId: topVendor._id,
          assignedVendorName: topVendor.name,
          $push: {
            dispatchLog: {
              vendorId: topVendor._id,
              vendorName: topVendor.name,
              dispatchedAt: new Date(),
            },
          },
        });
      }
    }

    const savedJob = await VendorJob.findById(job._id)
      .populate("propertyId", "name address")
      .lean();

    return NextResponse.json({ job: savedJob }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vendors/jobs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
