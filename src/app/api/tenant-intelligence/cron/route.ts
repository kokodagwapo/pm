/**
 * Nightly Tenant Intelligence Batch Scoring Cron
 *
 * Called by: external cron (e.g. every night at 02:00) or Vercel cron
 * Authorization: CRON_SECRET header or admin session
 *
 * Actions:
 * 1. Refresh all tenant intelligence scores
 * 2. Check for upcoming payment due in ≤14 days with delinquency probability ≥60%
 * 3. Check for lease expiry threshold crossing (≤60 days)
 * 4. Auto-send threshold-triggered interventions if churnRiskLevel escalates to high
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole, PaymentStatus } from "@/types";
import connectDB from "@/lib/mongodb";
import { computeAndPersistScores } from "@/lib/services/tenant-intelligence.service";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";

const CRON_SECRET = process.env.TENANT_INTELLIGENCE_CRON_SECRET || process.env.CRON_SECRET;

const DELINQUENCY_RISK_THRESHOLD = 60;
const DELINQUENCY_WARNING_DAYS_AHEAD = 14;
const LEASE_EXPIRY_ALERT_DAYS = 60;

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
    const Payment = (await import("@/models/Payment")).default;
    const { notificationService, NotificationType, NotificationPriority } = await import("@/lib/notification-service");

    const tenants = await User.find({ role: UserRole.TENANT, deletedAt: null, isActive: true })
      .select("_id firstName lastName email moveInDate")
      .lean();

    const now = new Date();
    const warningWindowEnd = new Date(now);
    warningWindowEnd.setDate(warningWindowEnd.getDate() + DELINQUENCY_WARNING_DAYS_AHEAD);

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

        // 14-day delinquency early warning based on upcoming payment due date
        // Only trigger when delinquency probability >= configured threshold (60%)
        if (score.delinquencyProbabilityPct >= DELINQUENCY_RISK_THRESHOLD) {
          const upcomingPayment = await Payment.findOne({
            tenantId: tt._id,
            dueDate: { $gte: now, $lte: warningWindowEnd },
            status: {
              $nin: [PaymentStatus.PAID, PaymentStatus.COMPLETED],
            },
            deletedAt: null,
          })
            .select("dueDate amount")
            .lean();

          if (upcomingPayment) {
            const dueDate = new Date((upcomingPayment as unknown as { dueDate: Date }).dueDate);
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

            await notificationService.sendNotification({
              type: NotificationType.PAYMENT_REMINDER,
              priority: NotificationPriority.HIGH,
              userId: tt._id.toString(),
              title: "Upcoming Payment Reminder",
              message: `Hi ${tt.firstName || "there"}, your rent payment is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}. Please ensure your payment is submitted on time to avoid any late fees.`,
            });
            results.delinquencyWarnings++;
          }
        }

        // Lease expiry reminder (≤60 days out)
        const daysUntilExpiry = score.signals.daysUntilLeaseExpiry;
        if (
          daysUntilExpiry !== null &&
          daysUntilExpiry > 0 &&
          daysUntilExpiry <= LEASE_EXPIRY_ALERT_DAYS
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

        // Churn escalation: auto-intervene on first-time high-risk
        const churnEscalated =
          score.churnRiskLevel === "high" && prevChurnLevel !== "high" && !prevInterventionSent;

        if (churnEscalated) {
          await notificationService.sendNotification({
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            priority: NotificationPriority.HIGH,
            userId: tt._id.toString(),
            title: "We Value Your Tenancy",
            message: `Hi ${tt.firstName || "there"}, we noticed you may have some concerns. We'd love to connect and make sure your experience is great. Please reply to schedule a quick call with your property manager.`,
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
      config: {
        delinquencyRiskThreshold: DELINQUENCY_RISK_THRESHOLD,
        delinquencyWarningDaysAhead: DELINQUENCY_WARNING_DAYS_AHEAD,
        leaseExpiryAlertDays: LEASE_EXPIRY_ALERT_DAYS,
      },
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
    thresholds: {
      delinquencyRiskThreshold: DELINQUENCY_RISK_THRESHOLD,
      delinquencyWarningDaysAhead: DELINQUENCY_WARNING_DAYS_AHEAD,
      leaseExpiryAlertDays: LEASE_EXPIRY_ALERT_DAYS,
    },
    actions: [
      `Score all active tenants`,
      `14-day pre-due delinquency early-warning: payment due ≤${DELINQUENCY_WARNING_DAYS_AHEAD}d AND delinquency probability ≥${DELINQUENCY_RISK_THRESHOLD}%`,
      `Lease expiry reminder: ≤${LEASE_EXPIRY_ALERT_DAYS} days until expiry`,
      `Churn escalation auto-intervention: first-time transition to high risk`,
    ],
  });
}
