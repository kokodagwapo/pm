import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import LunaAutonomousAction from "@/models/LunaAutonomousAction";
import { lunaAutonomousService } from "@/lib/services/luna-autonomous.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    await dbConnect();
    const filter: Record<string, any> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const [actions, total, stats] = await Promise.all([
      LunaAutonomousAction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LunaAutonomousAction.countDocuments(filter),
      lunaAutonomousService.getActionStats(),
    ]);

    return NextResponse.json({
      actions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    });
  } catch (error) {
    console.error("[Luna Actions GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, actionId, notes, approve } = body;

    if (action === "review" && actionId) {
      const updated = await lunaAutonomousService.markHumanReviewed(
        actionId,
        session.user.id || session.user.email || "unknown",
        notes || "",
        approve === true
      );
      return NextResponse.json({ success: true, action: updated });
    }

    if (action === "trigger_demo") {
      await dbConnect();
      const demoActions = await Promise.all([
        lunaAutonomousService.evaluateOverduePayment({
          entityType: "payment",
          entityId: "demo_payment_001",
          affectedUserId: "demo_tenant_001",
          affectedPropertyId: "demo_property_001",
          data: {
            tenantName: "Sarah Johnson",
            tenantEmail: "demo@example.com",
            propertyName: "Sunset Apartments 2B",
            amount: 1850,
            daysOverdue: 8,
            paymentId: "demo_payment_001",
          },
        }),
        lunaAutonomousService.evaluateLeaseExpiry({
          entityType: "lease",
          entityId: "demo_lease_001",
          affectedUserId: "demo_tenant_002",
          affectedPropertyId: "demo_property_002",
          data: {
            leaseId: "demo_lease_001",
            tenantName: "Michael Chen",
            tenantEmail: "demo2@example.com",
            propertyName: "Ocean View Unit 4A",
            expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
            daysUntilExpiry: 25,
            managerEmail: "manager@example.com",
            managerName: "Alex Rivera",
            managerId: "demo_manager_001",
          },
        }),
        lunaAutonomousService.evaluateMaintenanceRequest({
          entityType: "maintenance",
          entityId: "demo_maint_001",
          affectedUserId: "demo_tenant_003",
          affectedPropertyId: "demo_property_003",
          data: {
            requestId: "demo_maint_001",
            tenantName: "Emma Williams",
            tenantEmail: "demo3@example.com",
            propertyName: "Palmetto Gardens 101",
            category: "Plumbing",
            priority: "high",
            description: "Water heater not working",
            daysSinceSubmission: 2,
            isEmergency: false,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        actionsTriggered: demoActions.filter(Boolean).length,
        message: "Demo evaluation triggered successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Luna Actions POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
