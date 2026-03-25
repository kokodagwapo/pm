import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
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

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    await connectDB();
    const vendor = await Vendor.findById(id).lean();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error("GET /api/vendors/[id] error:", error);
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
    const allowedRoles = ["admin", "super_admin", "manager"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    await connectDB();

    const body = await request.json();

    const allowedFields = [
      "name",
      "contactName",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "zipCode",
      "categories",
      "serviceRadius",
      "isApproved",
      "isAvailable",
      "hourlyRate",
      "callOutFee",
      "notes",
      "bio",
      "licenseNumber",
      "licenseExpiryDate",
      "insuranceProvider",
      "insuranceExpiryDate",
      "insurancePolicyNumber",
      "backgroundCheckDate",
      "backgroundCheckStatus",
      "complianceHold",
      "complianceHoldReason",
      "bankAccountLast4",
      "bankRoutingLast4",
      "bankAccountVerified",
      "preferredAreas",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        if (
          ["licenseExpiryDate", "insuranceExpiryDate", "backgroundCheckDate"].includes(
            field
          ) &&
          body[field]
        ) {
          updates[field] = new Date(body[field]);
        } else {
          updates[field] = body[field];
        }
      }
    }

    updates.lastComplianceCheck = new Date();

    const vendor = await Vendor.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error("PATCH /api/vendors/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    if (!["admin", "super_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    await connectDB();
    const vendor = await Vendor.findByIdAndDelete(id);

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vendor deleted" });
  } catch (error) {
    console.error("DELETE /api/vendors/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
