import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import LunaAutonomousAction from "@/models/LunaAutonomousAction";
import { lunaAutonomousService } from "@/lib/services/luna-autonomous.service";
import {
  notificationService,
  NotificationType,
  NotificationPriority,
} from "@/lib/notification-service";

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.MANAGER];

function isAuthorized(role?: string): boolean {
  return !!role && ALLOWED_ROLES.includes(role);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    await connectDB();
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
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, actionId, notes, approve } = body;

    if (action === "review" && actionId) {
      await connectDB();

      const existingAction = await LunaAutonomousAction.findById(actionId).lean();
      if (!existingAction) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
      }

      if (existingAction.status !== "pending_human") {
        return NextResponse.json(
          { error: "Action is not pending review" },
          { status: 400 }
        );
      }

      const reviewedBy =
        (session.user as any).id ||
        session.user.email ||
        (session.user as any).name ||
        "unknown";

      if (approve === true) {
        await executeApprovedAction(existingAction as any);
      }

      const updated = await LunaAutonomousAction.findByIdAndUpdate(
        actionId,
        {
          status: approve === true ? "executed" : "skipped",
          humanReviewNotes: notes || "",
          humanReviewedAt: new Date(),
          humanReviewedBy: reviewedBy,
          executedAt: approve === true ? new Date() : undefined,
          $push: approve === true
            ? { actionsTaken: "human_approved_and_executed" }
            : { actionsTaken: "human_skipped" },
        },
        { new: true }
      );

      return NextResponse.json({ success: true, action: updated });
    }

    if (action === "trigger_demo") {
      await connectDB();
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
            description: "Water heater not working — no hot water for 2 days",
            daysSinceSubmission: 2,
            isEmergency: false,
          },
        }),
        lunaAutonomousService.evaluateMaintenanceRequest({
          entityType: "maintenance",
          entityId: "demo_maint_002",
          affectedUserId: "demo_tenant_004",
          affectedPropertyId: "demo_property_004",
          data: {
            requestId: "demo_maint_002",
            tenantName: "James Rivera",
            tenantEmail: "demo4@example.com",
            propertyName: "Harbor Lofts 305",
            category: "Electrical",
            priority: "emergency",
            description: "Power outage in entire unit, sparks from main panel",
            daysSinceSubmission: 0,
            isEmergency: true,
            managerEmail: "manager@example.com",
            managerName: "Alex Rivera",
            managerId: "demo_manager_001",
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

async function executeApprovedAction(action: {
  category: string;
  metadata: Record<string, any>;
  affectedUserId?: string;
  triggerEntityType?: string;
  triggerEntityId?: string;
}): Promise<void> {
  try {
    const meta = action.metadata || {};

    switch (action.category) {
      case "payment_reminder":
      case "payment_escalation": {
        if (!meta.tenantEmail || !action.affectedUserId) break;
        await notificationService.sendNotification({
          type:
            action.category === "payment_escalation"
              ? NotificationType.PAYMENT_OVERDUE
              : NotificationType.PAYMENT_REMINDER,
          priority:
            action.category === "payment_escalation"
              ? NotificationPriority.HIGH
              : NotificationPriority.NORMAL,
          userId: action.affectedUserId,
          title:
            action.category === "payment_escalation"
              ? "Overdue Payment — Immediate Action Required"
              : "Payment Reminder",
          message: `A payment is ${action.category === "payment_escalation" ? "significantly overdue" : "due soon"} for ${meta.propertyName || "your property"}.`,
          data: {
            userEmail: meta.tenantEmail,
            userName: meta.tenantName || "Tenant",
            propertyName: meta.propertyName,
            rentAmount: meta.amount,
            daysOverdue: meta.daysOverdue,
            amount: meta.amount,
          },
        });
        break;
      }

      case "maintenance_triage":
      case "maintenance_escalation": {
        if (!meta.tenantEmail || !action.affectedUserId) break;
        await notificationService.sendNotification({
          type: NotificationType.MAINTENANCE_UPDATE,
          priority:
            action.category === "maintenance_escalation"
              ? NotificationPriority.CRITICAL
              : NotificationPriority.NORMAL,
          userId: action.affectedUserId,
          title:
            action.category === "maintenance_escalation"
              ? `EMERGENCY: ${meta.category || "Maintenance"} at ${meta.propertyName}`
              : `Maintenance Update — ${meta.propertyName}`,
          message: meta.description || "Your maintenance request has been reviewed.",
          data: {
            userEmail: meta.tenantEmail,
            userName: meta.tenantName || "Tenant",
            requestId: meta.requestId || action.triggerEntityId || "N/A",
            propertyName: meta.propertyName,
            status:
              action.category === "maintenance_escalation"
                ? "emergency_escalated"
                : "triaged",
            description: meta.description,
            notes:
              "This action was approved and executed by a property manager via Luna review.",
          },
        });
        break;
      }

      case "lease_renewal_notice":
      case "lease_expiry_alert": {
        if (!meta.tenantEmail || !action.affectedUserId) break;
        await notificationService.sendNotification({
          type: NotificationType.LEASE_EXPIRY,
          priority:
            (meta.daysUntilExpiry || 30) <= 14
              ? NotificationPriority.HIGH
              : NotificationPriority.NORMAL,
          userId: action.affectedUserId,
          title: `Lease ${action.category === "lease_expiry_alert" ? "Expiry Alert" : "Renewal Notice"}`,
          message: `Your lease for ${meta.propertyName} expires in ${meta.daysUntilExpiry || "N/A"} days.`,
          data: {
            userEmail: meta.tenantEmail,
            userName: meta.tenantName || "Tenant",
            propertyName: meta.propertyName,
            expiryDate: meta.expiryDate,
            daysUntilExpiry: meta.daysUntilExpiry,
            leaseId: meta.leaseId,
            isLandlord: false,
          },
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[Luna] executeApprovedAction failed:", err);
  }
}
