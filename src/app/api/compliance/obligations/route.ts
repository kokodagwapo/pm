export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ComplianceObligation from "@/models/ComplianceObligation";
import Property from "@/models/Property";
import mongoose from "mongoose";
import { calendarService } from "@/lib/services/calendar.service";
import { EventType, EventPriority, LocationType } from "@/types";

interface SessionUser {
  id: string;
  role: string;
}

async function getAuthorizedPropertyIds(userId: string, role: string): Promise<mongoose.Types.ObjectId[] | null> {
  if (["admin", "super_admin"].includes(role)) return null;
  if (role === "manager") {
    const managed = await Property.find({ managerId: userId }, "_id").lean();
    const owned = await Property.find({ ownerId: userId }, "_id").lean();
    const ids = [...managed, ...owned].map((p) => p._id as mongoose.Types.ObjectId);
    return ids;
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
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const upcoming = searchParams.get("upcoming");

    const query: Record<string, unknown> = { isActive: true };

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
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (upcoming === "true") {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      query.dueDate = { $lte: thirtyDays };
      query.status = { $nin: ["completed", "waived", "not_applicable"] };
    }

    const obligations = await ComplianceObligation.find(query)
      .populate("propertyId", "name address")
      .populate("assignedTo", "firstName lastName email")
      .populate("jurisdictionRuleId", "title category referenceUrl")
      .sort({ dueDate: 1, severity: -1 })
      .lean();

    const stats = {
      total: obligations.length,
      pending: obligations.filter((o) => o.status === "pending").length,
      in_progress: obligations.filter((o) => o.status === "in_progress").length,
      completed: obligations.filter((o) => o.status === "completed").length,
      overdue: obligations.filter((o) => o.status === "overdue").length,
      critical: obligations.filter((o) => o.severity === "critical").length,
      high: obligations.filter((o) => o.severity === "high").length,
    };

    return NextResponse.json({ obligations, stats });
  } catch (error) {
    console.error("Error fetching compliance obligations:", error);
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

    const authorizedIds = await getAuthorizedPropertyIds(user.id, user.role);
    if (authorizedIds !== null) {
      const isAuthorized = authorizedIds.some((id) => id.toString() === data.propertyId);
      if (!isAuthorized) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const obligation = await ComplianceObligation.create({
      ...data,
      createdBy: user.id,
    });

    // Auto-create a calendar event for obligations that have a due date
    if (data.dueDate) {
      try {
        const dueDate = new Date(data.dueDate);
        const endDate = new Date(dueDate);
        endDate.setHours(endDate.getHours() + 1);

        await calendarService.createEvent(
          {
            title: `[Compliance] ${data.title || "Compliance Deadline"}`,
            description: data.description || `Compliance obligation due: ${data.category}`,
            type: EventType.COMPLIANCE_DEADLINE,
            priority: data.severity === "critical" ? EventPriority.URGENT : data.severity === "high" ? EventPriority.HIGH : EventPriority.NORMAL,
            startDate: dueDate,
            endDate,
            allDay: true,
            propertyId: data.propertyId,
            organizer: user.id,
            location: { type: LocationType.OTHER },
          },
          user.id
        );
      } catch (calendarErr) {
        console.warn("Failed to create calendar event for compliance obligation:", calendarErr);
      }
    }

    const populated = await ComplianceObligation.findById(obligation._id)
      .populate("propertyId", "name address")
      .populate("assignedTo", "firstName lastName email")
      .lean();

    return NextResponse.json({ obligation: populated }, { status: 201 });
  } catch (error) {
    console.error("Error creating compliance obligation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
