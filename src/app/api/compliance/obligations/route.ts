import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ComplianceObligation from "@/models/ComplianceObligation";
import Property from "@/models/Property";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const upcoming = searchParams.get("upcoming");

    const query: any = { isActive: true };

    if (propertyId) {
      query.propertyId = propertyId;
    } else {
      const userRole = (session.user as any).role;
      const userId = (session.user as any).id;
      if (!["admin", "super_admin", "manager"].includes(userRole)) {
        const ownedProperties = await Property.find({ ownerId: userId }, "_id").lean();
        query.propertyId = { $in: ownedProperties.map((p) => p._id) };
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

    const userRole = (session.user as any).role;
    if (!["admin", "super_admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const data = await request.json();

    const obligation = await ComplianceObligation.create({
      ...data,
      createdBy: (session.user as any).id,
    });

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
