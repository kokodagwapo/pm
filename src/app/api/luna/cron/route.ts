/**
 * Luna Cron / Scheduled Trigger Endpoint
 *
 * This endpoint is intended to be called by an external cron scheduler
 * (e.g. Vercel Cron, uptime robot, GitHub Actions schedule) at regular
 * intervals (recommended: every 30 minutes).
 *
 * Security:
 *   - Requires LUNA_CRON_SECRET env variable.
 *   - The caller must send the header: Authorization: Bearer <LUNA_CRON_SECRET>
 *   - OR the request must come from an authenticated ADMIN/MANAGER session.
 *
 * This is separate from the UI-invokable /api/luna/trigger (POST) endpoint
 * to make it clear that scheduled execution is distinct from manual runs.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Lease from "@/models/Lease";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import LunaSettings from "@/models/LunaSettings";
import { lunaAutonomousService, DEFAULT_LUNA_SETTINGS } from "@/lib/services/luna-autonomous.service";
import { PaymentStatus, LeaseStatus, MaintenancePriority, MaintenanceStatus } from "@/types";

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.MANAGER];

function isBearerAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.LUNA_CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = req.headers.get("authorization") || "";
  return authHeader === `Bearer ${cronSecret}`;
}

async function runTriggerCycle() {
  await connectDB();

  const savedSettings = await LunaSettings.findOne().sort({ updatedAt: -1 }).lean();
  if (savedSettings) {
    lunaAutonomousService.updateSettings({
      mode: savedSettings.mode,
      confidenceThreshold: savedSettings.confidenceThreshold,
      enabledCategories: savedSettings.enabledCategories as never[],
      digestEmailEnabled: savedSettings.digestEmailEnabled,
      digestEmailFrequency: savedSettings.digestEmailFrequency,
      maxActionsPerHour: savedSettings.maxActionsPerHour,
      humanReviewThreshold: savedSettings.humanReviewThreshold,
      spendingLimit: savedSettings.spendingLimit ?? DEFAULT_LUNA_SETTINGS.spendingLimit,
      escalationContacts: (savedSettings.escalationContacts ?? []) as never[],
      roleAutonomyConfig: (savedSettings.roleAutonomyConfig ?? DEFAULT_LUNA_SETTINGS.roleAutonomyConfig) as never[],
    });
  }

  const currentSettings = lunaAutonomousService.getSettings();
  if (currentSettings.mode === "off") {
    return { triggered: 0, message: "Luna is in observation mode — no actions taken" };
  }

  const results = {
    overduePayments: 0,
    expiringLeases: 0,
    unassignedMaintenance: 0,
    emergencyMaintenance: 0,
    unansweredMessages: 0,
  };

  const now = new Date();

  const overduePayments = await Payment.find({
    status: PaymentStatus.OVERDUE,
    deletedAt: null,
  })
    .populate("tenantId", "email firstName lastName preferredLocale")
    .populate("propertyId", "name address")
    .sort({ dueDate: 1 })
    .limit(20)
    .lean();

  for (const payment of overduePayments) {
    const tenant = payment.tenantId as Record<string, string> | null;
    const property = payment.propertyId as Record<string, string> | null;
    if (!tenant?.email) continue;

    const daysOverdue = Math.floor(
      (now.getTime() - new Date(payment.dueDate).getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysOverdue <= 0) continue;

    await lunaAutonomousService.evaluateOverduePayment({
      entityType: "payment",
      entityId: String(payment._id),
      affectedUserId: String(tenant._id),
      affectedPropertyId: property ? String(property._id) : undefined,
      data: {
        paymentId: String(payment._id),
        tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
        tenantEmail: tenant.email,
        propertyName: property?.name || property?.address || "Property",
        amount: Number(payment.amount) || 0,
        daysOverdue,
        tenantLocale: tenant.preferredLocale || "en",
      },
    });
    results.overduePayments++;
  }

  const leaseExpiryThreshold = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const expiringLeases = await Lease.find({
    status: LeaseStatus.ACTIVE,
    endDate: { $lte: leaseExpiryThreshold, $gte: now },
  })
    .populate("tenantId", "email firstName lastName preferredLocale")
    .populate("propertyId", "name address")
    .sort({ endDate: 1 })
    .limit(20)
    .lean();

  for (const lease of expiringLeases) {
    const tenant = lease.tenantId as Record<string, string> | null;
    const property = lease.propertyId as Record<string, string> | null;
    if (!tenant?.email) continue;

    const daysUntilExpiry = Math.floor(
      (new Date(lease.endDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const leaseMilestone = daysUntilExpiry <= 15 ? "15d" : daysUntilExpiry <= 30 ? "30d" : "60d";
    const leaseEntityId = `${String(lease._id)}_${leaseMilestone}`;

    const cronRenewalResponse = (lease as Record<string, unknown>).lunaRenewalResponse as
      | "accepted"
      | "negotiating"
      | "declined"
      | null;
    await lunaAutonomousService.evaluateLeaseExpiry({
      entityType: "lease",
      entityId: leaseEntityId,
      affectedUserId: String(tenant._id),
      affectedPropertyId: property ? String(property._id) : undefined,
      data: {
        leaseId: String(lease._id),
        tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
        tenantEmail: tenant.email,
        propertyName: property?.name || property?.address || "Property",
        expiryDate: new Date(lease.endDate),
        daysUntilExpiry,
        tenantLocale: tenant.preferredLocale || "en",
        tenantResponse: cronRenewalResponse ?? null,
      },
    });
    results.expiringLeases++;
  }

  const unassignedCutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const unassignedRequests = await MaintenanceRequest.find({
    status: {
      $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
    },
    priority: { $in: [MaintenancePriority.HIGH, MaintenancePriority.MEDIUM] },
    assignedTo: { $exists: false },
    createdAt: { $lte: unassignedCutoff },
    deletedAt: null,
  })
    .populate("tenantId", "email firstName lastName preferredLocale")
    .populate("propertyId", "name address")
    .limit(10)
    .lean();

  for (const mReq of unassignedRequests) {
    const tenant = mReq.tenantId as Record<string, string> | null;
    const property = mReq.propertyId as Record<string, string> | null;
    if (!tenant?.email) continue;

    const hoursUnassigned = Math.floor(
      (now.getTime() - new Date(mReq.createdAt).getTime()) / (60 * 60 * 1000)
    );

    await lunaAutonomousService.evaluateMaintenanceRequest({
      entityType: "maintenance",
      entityId: String(mReq._id),
      affectedUserId: String(tenant._id),
      affectedPropertyId: property ? String(property._id) : undefined,
      data: {
        requestId: String(mReq._id),
        tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
        tenantEmail: tenant.email,
        propertyName: property?.name || property?.address || "Property",
        category: String(mReq.category || "General"),
        priority: String(mReq.priority),
        description: String(mReq.description || ""),
        hoursUnassigned,
        isEmergency: false,
        estimatedCost: typeof mReq.estimatedCost === "number" ? mReq.estimatedCost : undefined,
        tenantLocale: tenant.preferredLocale || "en",
      },
    });
    results.unassignedMaintenance++;
  }

  const emergencyRequests = await MaintenanceRequest.find({
    status: {
      $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
    },
    priority: MaintenancePriority.EMERGENCY,
    createdAt: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
    deletedAt: null,
  })
    .populate("tenantId", "email firstName lastName preferredLocale")
    .populate("propertyId", "name address")
    .limit(5)
    .lean();

  for (const eReq of emergencyRequests) {
    const tenant = eReq.tenantId as Record<string, string> | null;
    const property = eReq.propertyId as Record<string, string> | null;
    if (!tenant?.email) continue;

    const hoursUnassigned = Math.floor(
      (now.getTime() - new Date(eReq.createdAt).getTime()) / (60 * 60 * 1000)
    );

    await lunaAutonomousService.evaluateMaintenanceRequest({
      entityType: "maintenance",
      entityId: String(eReq._id),
      affectedUserId: String(tenant._id),
      affectedPropertyId: property ? String(property._id) : undefined,
      data: {
        requestId: String(eReq._id),
        tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
        tenantEmail: tenant.email,
        propertyName: property?.name || property?.address || "Property",
        category: String(eReq.category || "General"),
        priority: String(eReq.priority),
        description: String(eReq.description || ""),
        hoursUnassigned,
        isEmergency: true,
        estimatedCost: typeof eReq.estimatedCost === "number" ? eReq.estimatedCost : undefined,
        tenantLocale: tenant.preferredLocale || "en",
      },
    });
    results.emergencyMaintenance++;
  }

  const messageCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const staleConversations = await Conversation.find({
    "lastMessage.createdAt": { $lte: messageCutoff },
    isArchived: false,
    deletedAt: null,
  })
    .populate("participants.userId", "email firstName lastName role preferredLocale")
    .sort({ "lastMessage.createdAt": 1 })
    .limit(10)
    .lean();

  for (const convo of staleConversations) {
    if (!convo.lastMessage) continue;

    const participants = convo.participants as Array<{
      userId: Record<string, string>;
      role: string;
    }>;

    const tenantParticipant = participants.find(
      (p) => p.userId && (p.userId as Record<string, string>).role === UserRole.TENANT
    );
    const managerParticipant = participants.find(
      (p) =>
        p.userId &&
        [UserRole.ADMIN, UserRole.MANAGER].includes(
          ((p.userId as Record<string, string>).role as string) as UserRole
        )
    );

    if (!tenantParticipant?.userId?.email) continue;

    const lastSenderId = String(convo.lastMessage.senderId);
    const tenantId = String(tenantParticipant.userId._id);
    if (lastSenderId !== tenantId) continue;

    const lastReply = await Message.findOne({
      conversationId: convo._id,
      senderId: { $ne: convo.lastMessage.senderId },
      createdAt: { $gte: convo.lastMessage.createdAt },
    }).lean();

    if (lastReply) continue;

    const hoursUnanswered = Math.floor(
      (now.getTime() - new Date(convo.lastMessage.createdAt).getTime()) / (60 * 60 * 1000)
    );

    const tenant = tenantParticipant.userId as Record<string, string>;
    const manager = managerParticipant?.userId as Record<string, string> | undefined;

    await lunaAutonomousService.evaluateUnansweredMessage({
      entityType: "tenant",
      entityId: String(convo._id),
      affectedUserId: tenantId,
      data: {
        conversationId: String(convo._id),
        tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
        tenantEmail: tenant.email,
        lastMessagePreview: convo.lastMessage.content || "",
        hoursUnanswered,
        managerEmail: manager?.email,
        managerName: manager
          ? `${manager.firstName || ""} ${manager.lastName || ""}`.trim()
          : undefined,
        managerId: manager ? String(manager._id) : undefined,
        tenantLocale: tenant.preferredLocale || "en",
      },
    });
    results.unansweredMessages++;
  }

  // 6. System digest (check settings frequency + send if due)
  const digestSettings = lunaAutonomousService.getSettings();
  if (digestSettings.digestEmailEnabled) {
    try {
      const User = (await import("@/models/User")).default;
      const Property = (await import("@/models/Property")).default;
      const LunaAutonomousAction = (await import("@/models/LunaAutonomousAction")).default;

      const digestFrequency = digestSettings.digestEmailFrequency;
      const digestIntervalMs =
        digestFrequency === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

      const lastDigest = await LunaAutonomousAction.findOne({
        category: "system_digest",
        status: "executed",
      })
        .sort({ createdAt: -1 })
        .lean();

      const shouldSendDigest =
        !lastDigest ||
        now.getTime() - new Date(lastDigest.createdAt).getTime() >= digestIntervalMs;

      if (shouldSendDigest) {
        const [
          propertyCount,
          activeLeaseCount,
          overduePaymentCount,
          overduePaymentAgg,
          openMaintenanceCount,
          emergencyMaintenanceCount,
          expiringLeasesCount,
          actionsExecutedToday,
        ] = await Promise.all([
          Property.countDocuments({ deletedAt: null }),
          Lease.countDocuments({ status: LeaseStatus.ACTIVE }),
          Payment.countDocuments({ status: PaymentStatus.OVERDUE, deletedAt: null }),
          Payment.aggregate([
            { $match: { status: PaymentStatus.OVERDUE, deletedAt: null } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          MaintenanceRequest.countDocuments({
            status: { $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
            deletedAt: null,
          }),
          MaintenanceRequest.countDocuments({
            priority: MaintenancePriority.EMERGENCY,
            status: { $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
          }),
          Lease.countDocuments({
            status: LeaseStatus.ACTIVE,
            endDate: {
              $lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
              $gte: now,
            },
          }),
          LunaAutonomousAction.countDocuments({
            status: "executed",
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            },
          }),
        ]);

        const overduePaymentTotal =
          (overduePaymentAgg as Array<{ total: number }>)[0]?.total || 0;

        const digestSettings = lunaAutonomousService.getSettings();
        const digestRoles = (digestSettings.roleAutonomyConfig || [])
          .filter((r: { receivesDigest?: boolean }) => r.receivesDigest !== false)
          .map((r: { role: string }) => r.role);
        const digestRoleFilter = digestRoles.length > 0
          ? digestRoles.map((r: string) => {
              if (r === "admin") return UserRole.ADMIN;
              if (r === "manager") return UserRole.MANAGER;
              return null;
            }).filter(Boolean)
          : [UserRole.ADMIN, UserRole.MANAGER];
        const managers = await User.find({
          role: { $in: digestRoleFilter },
          deletedAt: null,
        })
          .select("email firstName lastName")
          .limit(5)
          .lean();

        if (managers.length > 0) {
          await Promise.all(
            managers.map((mgr) =>
              lunaAutonomousService.generateSystemDigest({
                entityType: "system",
                data: {
                  propertyCount,
                  activeLeaseCount,
                  overduePaymentCount,
                  overduePaymentTotal,
                  openMaintenanceCount,
                  emergencyMaintenanceCount,
                  expiringLeasesCount,
                  actionsExecutedToday,
                  managerEmail: mgr.email,
                  managerName:
                    `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim(),
                  managerId: String(mgr._id),
                },
              })
            )
          );
        }
      }
    } catch (digestErr) {
      console.error("[Luna Cron] Digest error:", digestErr);
    }
  }

  return { triggered: Object.values(results).reduce((a, b) => a + b, 0), breakdown: results };
}

export async function GET(req: NextRequest) {
  try {
    if (!isBearerAuthorized(req)) {
      const session = await auth();
      if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await runTriggerCycle();
    return NextResponse.json({
      success: true,
      ...result,
      autonomyMode: lunaAutonomousService.getSettings().mode,
      timestamp: new Date().toISOString(),
      source: "cron_get",
    });
  } catch (error) {
    console.error("[Luna Cron]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isBearerAuthorized(req)) {
      const session = await auth();
      if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await runTriggerCycle();
    return NextResponse.json({
      success: true,
      ...result,
      autonomyMode: lunaAutonomousService.getSettings().mode,
      timestamp: new Date().toISOString(),
      source: "cron_post",
    });
  } catch (error) {
    console.error("[Luna Cron]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
