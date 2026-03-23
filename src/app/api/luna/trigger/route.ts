/**
 * Luna Autonomous Operations Trigger Engine
 *
 * Polls real DB data and calls the Luna service to evaluate each trigger.
 * Triggers:
 *   - Overdue payments (>0 days past due)
 *   - Maintenance requests unassigned >4h (or emergency in last 2h)
 *   - Leases expiring within 60 days
 *   - Unanswered tenant messages >24h
 *
 * Accessible only by ADMIN and MANAGER roles.
 */

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

function isAuthorized(role?: string): boolean {
  return !!role && ALLOWED_ROLES.includes(role);
}

export async function POST(req: NextRequest) {
  void req;
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      });
    }

    const currentSettings = lunaAutonomousService.getSettings();
    if (currentSettings.mode === "off") {
      return NextResponse.json({
        success: true,
        message: "Luna is in observation mode — no actions taken",
        triggered: 0,
      });
    }

    const results = {
      overduePayments: 0,
      expiringLeases: 0,
      unassignedMaintenance: 0,
      emergencyMaintenance: 0,
      unansweredMessages: 0,
    };

    const now = new Date();

    // ── 1. Overdue Payments ─────────────────────────────────────────────────
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
          tenantLocale: tenant.preferredLocale || "en-US",
        },
      });
      results.overduePayments++;
    }

    // ── 2. Expiring Leases ──────────────────────────────────────────────────
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

      await lunaAutonomousService.evaluateLeaseExpiry({
        entityType: "lease",
        entityId: String(lease._id),
        affectedUserId: String(tenant._id),
        affectedPropertyId: property ? String(property._id) : undefined,
        data: {
          leaseId: String(lease._id),
          tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
          tenantEmail: tenant.email,
          propertyName: property?.name || property?.address || "Property",
          expiryDate: new Date(lease.endDate),
          daysUntilExpiry,
          tenantLocale: tenant.preferredLocale || "en-US",
          tenantResponse: null,
        },
      });
      results.expiringLeases++;
    }

    // ── 3. Maintenance Requests Unassigned >4h ──────────────────────────────
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
          tenantLocale: tenant.preferredLocale || "en-US",
        },
      });
      results.unassignedMaintenance++;
    }

    // ── 4. Emergency Maintenance (last 2h) ──────────────────────────────────
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
          tenantLocale: tenant.preferredLocale || "en-US",
        },
      });
      results.emergencyMaintenance++;
    }

    // ── 5. Unanswered Tenant Messages >24h ──────────────────────────────────
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
          managerName: manager ? `${manager.firstName || ""} ${manager.lastName || ""}`.trim() : undefined,
          managerId: manager ? String(manager._id) : undefined,
          tenantLocale: tenant.preferredLocale || "en-US",
        },
      });
      results.unansweredMessages++;
    }

    const totalTriggered = Object.values(results).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      triggered: totalTriggered,
      breakdown: results,
      autonomyMode: currentSettings.mode,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Luna Trigger Engine]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  void req;
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      description:
        "POST to this endpoint to trigger Luna's autonomous evaluation engine against live DB data.",
      supports: [
        "overdue_payments",
        "expiring_leases",
        "maintenance_unassigned_4h",
        "emergency_maintenance",
        "unanswered_messages_24h",
      ],
      method: "POST",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
