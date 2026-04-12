export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import EvictionCase from "@/models/EvictionCase";
import Property from "@/models/Property";
import mongoose from "mongoose";

interface SessionUser {
  id: string;
  role: string;
}

async function getAuthorizedPropertyIds(
  userId: string,
  role: string
): Promise<mongoose.Types.ObjectId[] | null> {
  if (["admin", "super_admin"].includes(role)) return null;
  if (role === "manager") {
    const managed = await Property.find({ managerId: userId }, "_id").lean();
    const owned = await Property.find({ ownerId: userId }, "_id").lean();
    return [...managed, ...owned].map((p) => p._id as mongoose.Types.ObjectId);
  }
  const owned = await Property.find({ ownerId: userId }, "_id").lean();
  return owned.map((p) => p._id as mongoose.Types.ObjectId);
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
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid case ID" }, { status: 400 });
    }

    const evictionCase = await EvictionCase.findById(id);
    if (!evictionCase) {
      return NextResponse.json({ error: "Eviction case not found" }, { status: 404 });
    }

    const authorizedIds = await getAuthorizedPropertyIds(user.id, user.role);
    if (authorizedIds !== null) {
      const isAuthorized = authorizedIds.some(
        (pid) => pid.toString() === evictionCase.propertyId.toString()
      );
      if (!isAuthorized) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const allowed = ["status", "currentStep", "notes", "filedAt", "courtDate", "judgmentDate", "resolution"];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        (evictionCase as Record<string, unknown>)[key] = body[key];
      }
    }

    if (body.completeStep !== undefined) {
      const stepIdx = evictionCase.steps.findIndex(
        (s) => s.stepNumber === body.completeStep
      );
      if (stepIdx >= 0) {
        evictionCase.steps[stepIdx].completedAt = new Date();
        evictionCase.steps[stepIdx].completedBy = new mongoose.Types.ObjectId(user.id);
        if (body.stepNotes) evictionCase.steps[stepIdx].notes = body.stepNotes;
        evictionCase.currentStep = Math.max(evictionCase.currentStep, body.completeStep);
      }
    }

    await evictionCase.save();

    const updated = await EvictionCase.findById(id)
      .populate("propertyId", "name address")
      .populate("tenantId", "firstName lastName email")
      .lean();

    return NextResponse.json({ case: updated });
  } catch (error) {
    console.error("Error updating eviction case:", error);
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

    const user = session.user as SessionUser;
    if (!["admin", "super_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid case ID" }, { status: 400 });
    }

    await EvictionCase.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting eviction case:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
