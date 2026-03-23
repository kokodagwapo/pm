import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import LunaAutonomousAction from "@/models/LunaAutonomousAction";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Vendor from "@/models/Vendor";
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
    const filter: Record<string, unknown> = {};
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

    const body = await req.json() as {
      action: string;
      actionId?: string;
      notes?: string;
      approve?: boolean;
    };
    const { action, actionId, notes, approve } = body;

    const reviewerId: string =
      (session.user as { id?: string }).id ||
      session.user.email ||
      (session.user as { name?: string }).name ||
      "unknown";

    // ── Review (approve or skip) a pending_human action ─────────────────────
    if (action === "review" && actionId) {
      await connectDB();

      // Enforce roleAutonomyConfig: only roles with canApproveActions may review
      const settings = lunaAutonomousService.getSettings();
      const userRole = session.user.role as string;
      const roleConfig = Array.isArray(settings.roleAutonomyConfig)
        ? settings.roleAutonomyConfig.find((r) => r.role === userRole)
        : undefined;
      if (roleConfig && !roleConfig.canApproveActions) {
        return NextResponse.json(
          { error: "Your role is not permitted to approve Luna actions" },
          { status: 403 }
        );
      }

      const existingAction = await LunaAutonomousAction.findById(actionId);
      if (!existingAction) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
      }

      if (existingAction.status !== "pending_human") {
        return NextResponse.json(
          { error: "Action is not pending review" },
          { status: 400 }
        );
      }

      let finalStatus: "executed" | "skipped" | "failed" = approve === true ? "executed" : "skipped";
      let executionError: string | undefined;

      if (approve === true) {
        try {
          await executeApprovedAction(existingAction);
        } catch (err: unknown) {
          finalStatus = "failed";
          executionError = err instanceof Error ? err.message : String(err);
        }
      }

      const updatePayload: Record<string, unknown> = {
        status: finalStatus,
        humanReviewNotes: notes || "",
        humanReviewedAt: new Date(),
        humanReviewedBy: reviewerId,
      };
      if (finalStatus === "executed") {
        updatePayload.executedAt = new Date();
        updatePayload.$push = { actionsTaken: "human_approved_and_executed" };
      } else if (finalStatus === "skipped") {
        updatePayload.$push = { actionsTaken: "human_skipped" };
      } else {
        updatePayload.executionError = executionError;
        updatePayload.$push = { actionsTaken: "human_approve_execution_failed" };
      }

      const updated = await LunaAutonomousAction.findByIdAndUpdate(
        actionId,
        updatePayload,
        { new: true }
      );

      return NextResponse.json({ success: true, action: updated });
    }

    // ── Undo an executed action ───────────────────────────────────────────────
    if (action === "undo" && actionId) {
      await connectDB();

      // Enforce roleAutonomyConfig: only roles with canOverrideActions may undo
      const settings = lunaAutonomousService.getSettings();
      const userRole = session.user.role as string;
      const roleConfig = Array.isArray(settings.roleAutonomyConfig)
        ? settings.roleAutonomyConfig.find((r) => r.role === userRole)
        : undefined;
      if (roleConfig && !roleConfig.canOverrideActions) {
        return NextResponse.json(
          { error: "Your role is not permitted to override Luna actions" },
          { status: 403 }
        );
      }

      const existingAction = await LunaAutonomousAction.findById(actionId);
      if (!existingAction) {
        return NextResponse.json({ error: "Action not found" }, { status: 404 });
      }

      if (existingAction.status !== "executed") {
        return NextResponse.json(
          { error: "Only executed actions can be undone" },
          { status: 400 }
        );
      }

      const updated = await LunaAutonomousAction.findByIdAndUpdate(
        actionId,
        {
          status: "undone",
          undoneAt: new Date(),
          undoneBy: reviewerId,
          humanReviewNotes: notes || "Manually overridden by manager.",
          $push: { actionsTaken: `undone_by:${reviewerId}` },
        },
        { new: true }
      );

      return NextResponse.json({ success: true, action: updated });
    }

    // ── Demo scan with synthetic data ─────────────────────────────────────────
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
            tenantLocale: "en-US",
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
            tenantResponse: null,
            tenantLocale: "en-US",
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
            hoursUnassigned: 6,
            isEmergency: false,
            tenantLocale: "en-US",
          },
        }),
        lunaAutonomousService.evaluateUnansweredMessage({
          entityType: "tenant",
          entityId: "demo_conv_001",
          affectedUserId: "demo_tenant_004",
          data: {
            conversationId: "demo_conv_001",
            tenantName: "James Rivera",
            tenantEmail: "demo4@example.com",
            propertyName: "Harbor Lofts 305",
            lastMessagePreview: "Hi, when will the parking permit issue be resolved? I was told last week...",
            hoursUnanswered: 31,
            managerEmail: "manager@example.com",
            managerName: "Alex Rivera",
            managerId: "demo_manager_001",
            tenantLocale: "en-US",
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
  metadata: Record<string, unknown>;
  affectedUserId?: string;
  triggerEntityType?: string;
  triggerEntityId?: string;
}): Promise<void> {
  const meta = (action.metadata || {}) as Record<string, string | number | undefined>;

  switch (action.category) {
    case "payment_reminder":
    case "payment_escalation": {
      const tenantEmail = meta.tenantEmail as string | undefined;
      const userId = action.affectedUserId;
      if (!tenantEmail || !userId) break;

      await notificationService.sendNotification({
        type:
          action.category === "payment_escalation"
            ? NotificationType.PAYMENT_OVERDUE
            : NotificationType.PAYMENT_REMINDER,
        priority:
          action.category === "payment_escalation"
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
        userId,
        title:
          action.category === "payment_escalation"
            ? "Overdue Payment — Immediate Action Required"
            : "Payment Reminder",
        message: `A payment is ${action.category === "payment_escalation" ? "significantly overdue" : "due soon"} for ${meta.propertyName || "your property"}.\n\n—\nSent by SmartStart AI. To speak with a person, reply to this message or contact your property manager directly.`,
        data: {
          userEmail: tenantEmail,
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
      const tenantEmail = meta.tenantEmail as string | undefined;
      const userId = action.affectedUserId;
      const requestId = (meta.requestId as string) || (action.triggerEntityId as string);
      if (!tenantEmail || !userId) break;

      // Attempt vendor selection and work-order dispatch
      let vendorNote = "";
      if (requestId && requestId !== "demo_maint_001") {
        try {
          const category = (meta.category as string) || "General";
          const vendor = await Vendor.findOne({
            isApproved: true,
            $or: [
              { categories: { $regex: new RegExp(category, "i") } },
              { categories: { $elemMatch: { $regex: new RegExp(category, "i") } } },
            ],
          })
            .sort({ rating: -1, activeWorkOrders: 1 })
            .lean();

          if (vendor) {
            await Promise.all([
              MaintenanceRequest.findByIdAndUpdate(requestId, {
                assignedTo: vendor._id,
                status: "in_progress",
                vendorId: vendor._id,
                vendorName: vendor.name,
                dispatchedAt: new Date(),
              }),
              Vendor.findByIdAndUpdate(vendor._id, { $inc: { activeWorkOrders: 1 } }),
            ]);
            vendorNote = ` Vendor ${vendor.name} has been dispatched (ETA ~${vendor.responseTimeHours}h).`;
          } else {
            await MaintenanceRequest.findByIdAndUpdate(requestId, {
              status: "in_progress",
            });
          }
        } catch (dispatchErr) {
          console.error("[Luna executeApprovedAction] Vendor dispatch error:", dispatchErr);
        }
      }

      await notificationService.sendNotification({
        type: NotificationType.MAINTENANCE_UPDATE,
        priority:
          action.category === "maintenance_escalation"
            ? NotificationPriority.CRITICAL
            : NotificationPriority.NORMAL,
        userId,
        title:
          action.category === "maintenance_escalation"
            ? `EMERGENCY: ${meta.category || "Maintenance"} at ${meta.propertyName}`
            : `Maintenance Update — ${meta.propertyName}`,
        message: `Your maintenance request has been reviewed and is now in progress.${vendorNote}\n\n—\nSent by SmartStart AI. To speak with a person, contact your property manager directly.`,
        data: {
          userEmail: tenantEmail,
          userName: meta.tenantName || "Tenant",
          requestId: requestId || "N/A",
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
      const tenantEmail = meta.tenantEmail as string | undefined;
      const userId = action.affectedUserId;
      if (!tenantEmail || !userId) break;

      await notificationService.sendNotification({
        type: NotificationType.LEASE_EXPIRY,
        priority:
          Number(meta.daysUntilExpiry || 30) <= 14
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
        userId,
        title: `Lease ${action.category === "lease_expiry_alert" ? "Expiry Alert" : "Renewal Notice"}`,
        message: `Your lease for ${meta.propertyName} expires in ${meta.daysUntilExpiry || "N/A"} days.\n\n—\nSent by SmartStart AI. To speak with a person, reply to this message or contact your property manager directly.`,
        data: {
          userEmail: tenantEmail,
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

    case "tenant_communication": {
      const tenantEmail = meta.tenantEmail as string | undefined;
      const userId = action.affectedUserId;
      if (!tenantEmail || !userId) break;

      await notificationService.sendNotification({
        type: NotificationType.NEW_MESSAGE,
        priority: NotificationPriority.NORMAL,
        userId,
        title: "Your message has been received",
        message: `Thank you for your message. Your property manager has been notified and will respond shortly.\n\n—\nSent by SmartStart AI. To speak with a person, reply to this message or contact your property manager directly.`,
        data: {
          userEmail: tenantEmail,
          userName: meta.tenantName || "Tenant",
          conversationId: meta.conversationId,
        },
      });
      break;
    }

    default:
      break;
  }
}
