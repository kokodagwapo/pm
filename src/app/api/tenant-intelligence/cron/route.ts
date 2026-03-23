/**
 * Nightly Tenant Intelligence Batch Scoring Cron
 *
 * Called by: external cron (e.g. every night at 02:00) or Vercel cron
 * Authorization: CRON_SECRET header or admin session
 *
 * Actions:
 * 1. Refresh all tenant intelligence scores
 * 2. Check for 14-day delinquency early-warning
 * 3. Check for lease expiry threshold crossing (≤60 days)
 * 4. Auto-send threshold-triggered interventions if churnRiskLevel elevates
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import { computeAndPersistScores } from "@/lib/services/tenant-intelligence.service";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";

const CRON_SECRET = process.env.TENANT_INTELLIGENCE_CRON_SECRET || process.env.CRON_SECRET;

async function isAuthorized(req: NextRequest): Promise<boolean> {
  if (CRON_SECRET) {
    const provided = req.headers.get("x-cron-secret");
    if (provided === CRON_SECRET) return true;
  }
  const session = await auth();
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role;
  return role === UserRole.ADMIN;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const User = (await import("@/models/User")).default;
    const { notificationService } = await import("@/lib/notification-service");
    const { NotificationType, NotificationPriority } = await import("@/lib/notification-service");

    const tenants = await User.find({ role: UserRole.TENANT, deletedAt: null, isActive: true })
      .select("_id firstName lastName email moveInDate")
      .lean();

    const results = {
      processed: 0,
      delinquencyWarnings: 0,
      leaseExpiryAlerts: 0,
      churnInterventions: 0,
      errors: 0,
    };

    for (const t of tenants) {
      const tt = t as unknown as {
        _id: mongoose.Types.ObjectId;
        firstName?: string;
        lastName?: string;
        email?: string;
        moveInDate?: Date;
      };
      try {
        const prevRecord = await TenantIntelligence.findOne({ tenantId: tt._id })
          .select("churnRiskLevel delinquencyProbabilityPct interventionSent signals")
          .lean();

        const prevChurnLevel = prevRecord?.churnRiskLevel ?? "low";
        const prevInterventionSent = prevRecord?.interventionSent ?? false;

        const score = await computeAndPersistScores({
          tenantId: tt._id.toString(),
          tenantName: `${tt.firstName || ""} ${tt.lastName || ""}`.trim(),
          moveInDate: tt.moveInDate,
        });

        results.processed++;

        const daysUntilExpiry = score.signals.daysUntilLeaseExpiry;

        if (
          daysUntilExpiry !== null &&
          daysUntilExpiry > 0 &&
          daysUntilExpiry <= 14 &&
          score.delinquencyProbabilityPct >= 40
        ) {
          await notificationService.sendNotification({
            type: NotificationType.PAYMENT_REMINDER,
            priority: NotificationPriority.HIGH,
            userId: tt._id.toString(),
            title: "Friendly Payment Reminder",
            message: `Hi ${tt.firstName || "there"}, your next payment is coming up soon. Please ensure your payment method is up to date to avoid any late fees.`,
          });
          results.delinquencyWarnings++;
        }

        if (
          daysUntilExpiry !== null &&
          daysUntilExpiry > 0 &&
          daysUntilExpiry <= 60
        ) {
          await notificationService.sendNotification({
            type: NotificationType.LEASE_EXPIRY,
            priority: NotificationPriority.NORMAL,
            userId: tt._id.toString(),
            title: "Your Lease Expires Soon",
            message: `Hi ${tt.firstName || "there"}, your lease expires in ${daysUntilExpiry} days. Please contact your property manager to discuss renewal options.`,
          });
          results.leaseExpiryAlerts++;
        }

        const churnEscalated =
          score.churnRiskLevel === "high" && prevChurnLevel !== "high" && !prevInterventionSent;

        if (churnEscalated) {
          await notificationService.sendNotification({
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            priority: NotificationPriority.HIGH,
            userId: tt._id.toString(),
            title: "We Value Your Tenancy",
            message: `Hi ${tt.firstName || "there"}, we noticed you may have some concerns. We'd love to connect and make sure your experience with us is great. Please reply to schedule a quick call with your property manager.`,
          });

          await TenantIntelligence.findOneAndUpdate(
            { tenantId: tt._id },
            {
              $set: {
                interventionSent: true,
                interventionSentAt: new Date(),
              },
            }
          );

          results.churnInterventions++;
        }
      } catch {
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      runAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[TenantIntelligence Cron]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    description: "POST to this endpoint to run the nightly tenant intelligence batch scorer.",
    actions: [
      "Score all tenants",
      "14-day delinquency early-warning notifications",
      "60-day lease expiry reminders",
      "Churn escalation auto-intervention (first-time high-risk only)",
    ],
  });
}
