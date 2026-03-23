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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = session.user as SessionUser;
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {};

    if (propertyId) {
      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        return NextResponse.json({ error: "Invalid propertyId" }, { status: 400 });
      }
      const authorizedIds = await getAuthorizedPropertyIds(user.id, user.role);
      if (authorizedIds !== null) {
        const isAuthorized = authorizedIds.some((id) => id.toString() === propertyId);
        if (!isAuthorized) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      query.propertyId = new mongoose.Types.ObjectId(propertyId);
    } else {
      const authorizedIds = await getAuthorizedPropertyIds(user.id, user.role);
      if (authorizedIds !== null) {
        query.propertyId = { $in: authorizedIds };
      }
    }

    if (status) query.status = status;

    const cases = await EvictionCase.find(query)
      .populate("propertyId", "name address")
      .populate("tenantId", "firstName lastName email")
      .populate("createdBy", "firstName lastName")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Error fetching eviction cases:", error);
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
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const data = await request.json();

    if (!data.propertyId || !mongoose.Types.ObjectId.isValid(data.propertyId)) {
      return NextResponse.json({ error: "Valid propertyId is required" }, { status: 400 });
    }
    if (!data.state || !data.reason) {
      return NextResponse.json({ error: "state and reason are required" }, { status: 400 });
    }

    const authorizedIds = await getAuthorizedPropertyIds(user.id, user.role);
    if (authorizedIds !== null) {
      const isAuthorized = authorizedIds.some((id) => id.toString() === data.propertyId);
      if (!isAuthorized) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const evictionCase = await EvictionCase.create({
      propertyId: data.propertyId,
      tenantId: data.tenantId || undefined,
      unitNumber: data.unitNumber,
      state: data.state,
      reason: data.reason,
      steps: (data.steps || []).map((s: { stepNumber: number; name: string; description?: string }, i: number) => ({
        stepNumber: s.stepNumber ?? i + 1,
        name: s.name,
        description: s.description || "",
        documentsUploaded: [],
      })),
      currentStep: 0,
      status: "active",
      notes: data.notes,
      createdBy: user.id,
    });

    const populated = await EvictionCase.findById(evictionCase._id)
      .populate("propertyId", "name address")
      .populate("tenantId", "firstName lastName email")
      .lean();

    return NextResponse.json({ case: populated }, { status: 201 });
  } catch (error) {
    console.error("Error creating eviction case:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
