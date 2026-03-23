/**
 * Luna Autonomous Operations Trigger Engine
 *
 * Polls real DB data (overdue payments, expiring leases, unassigned/stale maintenance)
 * and calls the Luna autonomous service to evaluate and act on each trigger.
 *
 * Accessible only by ADMIN and MANAGER roles.
 * Can be scheduled externally (cron job, cloud scheduler) or triggered manually.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Lease from "@/models/Lease";
import MaintenanceRequest from "@/models/MaintenanceRequest";
import LunaSettings from "@/models/LunaSettings";
import { lunaAutonomousService, DEFAULT_LUNA_SETTINGS } from "@/lib/services/luna-autonomous.service";
import { PaymentStatus, LeaseStatus, MaintenanceStatus, MaintenancePriority } from "@/types";

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.MANAGER];

function isAuthorized(role?: string): boolean {
  return !!role && ALLOWED_ROLES.includes(role);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const savedSettings = await LunaSettings.findOne().sort({ updatedAt: -1 }).lean();
    if (savedSettings) {
      lunaAutonomousService.updateSettings(savedSettings as any);
    }

    const currentSettings = lunaAutonomousService.getSettings();
    if (currentSettings.mode === "off") {
      return NextResponse.json({
        success: true,
        message: "Luna is in observation mode — no actions taken",
        triggered: 0,
      });
    }

    const results: Record<string, number> = {
      overduePayments: 0,
      expiringLeases: 0,
      staleMaintenance: 0,
      emergencyMaintenance: 0,
    };

    const now = new Date();

    const overduePayments = await Payment.find({
      status: { $in: [PaymentStatus.OVERDUE, PaymentStatus.PENDING] },
      dueDate: { $lt: now },
      deletedAt: null,
    })
      .populate("tenantId", "email firstName lastName")
      .populate("propertyId", "name address")
      .limit(20)
      .lean();

    for (const payment of overduePayments) {
      const tenant = payment.tenantId as any;
      const property = payment.propertyId as any;
      if (!tenant?.email) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - new Date(payment.dueDate).getTime()) / (24 * 60 * 60 * 1000)
      );

      await lunaAutonomousService.evaluateOverduePayment({
        entityType: "payment",
        entityId: payment._id?.toString(),
        affectedUserId: tenant._id?.toString(),
        affectedPropertyId: property?._id?.toString(),
        data: {
          tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
          tenantEmail: tenant.email,
          propertyName: property?.name || property?.address || "Property",
          amount: payment.amount,
          daysOverdue,
          paymentId: payment._id?.toString() || "",
        },
      });
      results.overduePayments++;
    }

    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const expiringLeases = await Lease.find({
      status: LeaseStatus.ACTIVE,
      endDate: { $gt: now, $lte: in60Days },
      deletedAt: null,
    })
      .populate("tenantId", "email firstName lastName")
      .populate("propertyId", "name address")
      .limit(20)
      .lean();

    for (const lease of expiringLeases) {
      const tenant = lease.tenantId as any;
      const property = lease.propertyId as any;
      if (!tenant?.email) continue;

      const daysUntilExpiry = Math.ceil(
        (new Date(lease.endDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );

      await lunaAutonomousService.evaluateLeaseExpiry({
        entityType: "lease",
        entityId: lease._id?.toString(),
        affectedUserId: tenant._id?.toString(),
        affectedPropertyId: property?._id?.toString(),
        data: {
          leaseId: lease._id?.toString() || "",
          tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
          tenantEmail: tenant.email,
          propertyName: property?.name || property?.address || "Property",
          expiryDate: new Date(lease.endDate),
          daysUntilExpiry,
        },
      });
      results.expiringLeases++;
    }

    const staleCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const staleRequests = await MaintenanceRequest.find({
      status: {
        $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
      },
      priority: { $in: [MaintenancePriority.HIGH, MaintenancePriority.MEDIUM] },
      createdAt: { $lte: staleCutoff },
      deletedAt: null,
    })
      .populate("tenantId", "email firstName lastName")
      .populate("propertyId", "name address")
      .limit(10)
      .lean();

    for (const mReq of staleRequests) {
      const tenant = mReq.tenantId as any;
      const property = mReq.propertyId as any;
      if (!tenant?.email) continue;

      const daysSinceSubmission = Math.floor(
        (now.getTime() - new Date(mReq.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      );

      await lunaAutonomousService.evaluateMaintenanceRequest({
        entityType: "maintenance",
        entityId: mReq._id?.toString(),
        affectedUserId: tenant._id?.toString(),
        affectedPropertyId: property?._id?.toString(),
        data: {
          requestId: mReq._id?.toString() || "",
          tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
          tenantEmail: tenant.email,
          propertyName: property?.name || property?.address || "Property",
          category: mReq.category,
          priority: mReq.priority,
          description: mReq.description,
          daysSinceSubmission,
          isEmergency: false,
        },
      });
      results.staleMaintenance++;
    }

    const emergencyRequests = await MaintenanceRequest.find({
      status: {
        $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
      },
      priority: MaintenancePriority.EMERGENCY,
      createdAt: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      deletedAt: null,
    })
      .populate("tenantId", "email firstName lastName")
      .populate("propertyId", "name address")
      .limit(5)
      .lean();

    for (const eReq of emergencyRequests) {
      const tenant = eReq.tenantId as any;
      const property = eReq.propertyId as any;
      if (!tenant?.email) continue;

      const daysSinceSubmission = Math.floor(
        (now.getTime() - new Date(eReq.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      );

      await lunaAutonomousService.evaluateMaintenanceRequest({
        entityType: "maintenance",
        entityId: eReq._id?.toString(),
        affectedUserId: tenant._id?.toString(),
        affectedPropertyId: property?._id?.toString(),
        data: {
          requestId: eReq._id?.toString() || "",
          tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || "Tenant",
          tenantEmail: tenant.email,
          propertyName: property?.name || property?.address || "Property",
          category: eReq.category,
          priority: eReq.priority,
          description: eReq.description,
          daysSinceSubmission,
          isEmergency: true,
        },
      });
      results.emergencyMaintenance++;
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
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      description:
        "POST to this endpoint to trigger Luna's autonomous evaluation engine against live DB data.",
      supports: ["overdue_payments", "expiring_leases", "stale_maintenance", "emergency_maintenance"],
      method: "POST",
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
