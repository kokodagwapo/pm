import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ComplianceObligation from "@/models/ComplianceObligation";
import Property from "@/models/Property";
import mongoose from "mongoose";

interface SessionUser {
  id: string;
  role: string;
}

interface PopulatedProperty {
  _id: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId;
  managerId?: mongoose.Types.ObjectId;
}

async function canAccessObligation(
  user: SessionUser,
  obligation: { propertyId?: PopulatedProperty | null }
): Promise<boolean> {
  if (["admin", "super_admin"].includes(user.role)) return true;

  const property = obligation.propertyId;
  if (!property) return false;

  if (user.role === "manager") {
    return (
      property.ownerId?.toString() === user.id ||
      property.managerId?.toString() === user.id
    );
  }

  return property.ownerId?.toString() === user.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const user = session.user as SessionUser;

    const obligation = await ComplianceObligation.findOne({ _id: id, isActive: true })
      .populate<{ propertyId: PopulatedProperty }>("propertyId", "name address ownerId managerId")
      .populate("assignedTo", "firstName lastName email")
      .populate("jurisdictionRuleId")
      .lean();

    if (!obligation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!(await canAccessObligation(user, obligation))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ obligation });
  } catch (error) {
    console.error("Error fetching compliance obligation:", error);
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

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const user = session.user as SessionUser;
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const existing = await ComplianceObligation.findOne({ _id: id, isActive: true })
      .populate<{ propertyId: PopulatedProperty }>("propertyId", "ownerId managerId")
      .lean();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!(await canAccessObligation(user, existing))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const ALLOWED_FIELDS = [
      "status",
      "title",
      "description",
      "severity",
      "dueDate",
      "assignedTo",
      "notes",
      "reminderDays",
      "completedDate",
    ] as const;

    type AllowedField = typeof ALLOWED_FIELDS[number];

    const update: Partial<Record<AllowedField, unknown>> & { completedDate?: Date } = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        update[key] = body[key];
      }
    }

    if (update.status === "completed" && !update.completedDate) {
      update.completedDate = new Date();
    }

    const obligation = await ComplianceObligation.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    )
      .populate("propertyId", "name address")
      .populate("assignedTo", "firstName lastName email")
      .lean();

    return NextResponse.json({ obligation });
  } catch (error) {
    console.error("Error updating compliance obligation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const user = session.user as SessionUser;
    if (!["admin", "super_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const existing = await ComplianceObligation.findOne({ _id: id, isActive: true })
      .populate<{ propertyId: PopulatedProperty }>("propertyId", "ownerId managerId")
      .lean();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ComplianceObligation.findByIdAndUpdate(id, { isActive: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting compliance obligation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
