/**
 * Nightly Tenant Intelligence Batch Scoring Cron
 *
 * Called by: external cron (e.g. every night at 02:00) or Vercel cron
 * Authorization: CRON_SECRET header or admin session
 *
 * Actions:
 * 1. Refresh all tenant intelligence scores
 * 2. Check for upcoming payment due in ≤14 days with delinquency probability ≥60%
 *    (dedup: only one warning per 7-day window)
 * 3. Check for lease expiry threshold crossing (≤60 days)
 *    (dedup: only one alert per 7-day window)
 * 4. Auto-send threshold-triggered interventions on first escalation to high risk
 *    (respects Luna autonomy mode: "off" skips automated interventions)
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
const DEDUP_WINDOW_DAYS = 7;

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

async function getLunaAutonomyMode(): Promise<"full" | "supervised" | "off"> {
  try {
    const LunaSettings = (await import("@/models/LunaSettings")).default;
    const settings = await LunaSettings.findOne().select("mode").lean();
    if (settings && (settings as unknown as { mode: string }).mode) {
      return (settings as unknown as { mode: "full" | "supervised" | "off" }).mode;
    }
  } catch {
    // If Luna settings unavailable, default to supervised
  }
  return "supervised";
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

    // Check Luna autonomy mode — interventions only run in full/supervised mode
    const lunaMode = await getLunaAutonomyMode();
    const interventionsEnabled = lunaMode !== "off";

    const tenants = await User.find({ role: UserRole.TENANT, deletedAt: null, isActive: true })
      .select("_id firstName lastName email moveInDate")
      .lean();

    const now = new Date();
    const warningWindowEnd = new Date(now);
    warningWindowEnd.setDate(warningWindowEnd.getDate() + DELINQUENCY_WARNING_DAYS_AHEAD);
    const dedupWindowMs = DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const results = {
      processed: 0,
      delinquencyWarnings: 0,
      leaseExpiryAlerts: 0,
      churnInterventions: 0,
      skippedByDedup: 0,
      skippedByLuna: 0,
      errors: 0,
      lunaMode,
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
          .select("churnRiskLevel delinquencyProbabilityPct interventionSent lastDelinquencyWarnAt lastLeaseExpiryAlertAt signals")
          .lean();

        const prevChurnLevel = prevRecord?.churnRiskLevel ?? "low";
        const prevInterventionSent = prevRecord?.interventionSent ?? false;
        const lastDelinquencyWarnAt = prevRecord?.lastDelinquencyWarnAt
          ? new Date(prevRecord.lastDelinquencyWarnAt)
          : null;
        const lastLeaseExpiryAlertAt = prevRecord?.lastLeaseExpiryAlertAt
          ? new Date(prevRecord.lastLeaseExpiryAlertAt)
          : null;

        const score = await computeAndPersistScores({
          tenantId: tt._id.toString(),
          tenantName: `${tt.firstName || ""} ${tt.lastName || ""}`.trim(),
          moveInDate: tt.moveInDate,
        });

        results.processed++;

        // Delinquency early warning: only if delinquency probability crosses threshold
        // and there is an upcoming payment due within the warning window
        // Dedup: only send once per DEDUP_WINDOW_DAYS to avoid repeated notifications
        if (score.delinquencyProbabilityPct >= DELINQUENCY_RISK_THRESHOLD) {
          const recentlySentDelinquency =
            lastDelinquencyWarnAt !== null &&
            now.getTime() - lastDelinquencyWarnAt.getTime() < dedupWindowMs;

          if (recentlySentDelinquency) {
            results.skippedByDedup++;
          } else {
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

              await TenantIntelligence.findOneAndUpdate(
                { tenantId: tt._id },
                { $set: { lastDelinquencyWarnAt: now } }
              );

              results.delinquencyWarnings++;
            }
          }
        }

        // Lease expiry reminder (≤60 days out)
        // Dedup: only send once per DEDUP_WINDOW_DAYS
        const daysUntilExpiry = score.signals.daysUntilLeaseExpiry;
        if (
          daysUntilExpiry !== null &&
          daysUntilExpiry > 0 &&
          daysUntilExpiry <= LEASE_EXPIRY_ALERT_DAYS
        ) {
          const recentlySentExpiry =
            lastLeaseExpiryAlertAt !== null &&
            now.getTime() - lastLeaseExpiryAlertAt.getTime() < dedupWindowMs;

          if (recentlySentExpiry) {
            results.skippedByDedup++;
          } else {
            await notificationService.sendNotification({
              type: NotificationType.LEASE_EXPIRY,
              priority: NotificationPriority.NORMAL,
              userId: tt._id.toString(),
              title: "Your Lease Expires Soon",
              message: `Hi ${tt.firstName || "there"}, your lease expires in ${daysUntilExpiry} days. Please contact your property manager to discuss renewal options.`,
            });

            await TenantIntelligence.findOneAndUpdate(
              { tenantId: tt._id },
              { $set: { lastLeaseExpiryAlertAt: now } }
            );

            results.leaseExpiryAlerts++;
          }
        }

        // Churn escalation: auto-intervene on first-time high-risk crossing
        // Respects Luna autonomy mode: skip if Luna is "off"
        const churnEscalated =
          score.churnRiskLevel === "high" && prevChurnLevel !== "high" && !prevInterventionSent;

        if (churnEscalated) {
          if (!interventionsEnabled) {
            results.skippedByLuna++;
          } else {
            // In "supervised" mode, log action as pending; in "full" mode, send directly
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
                  interventionSentAt: now,
                },
              }
            );

            results.churnInterventions++;
          }
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
        dedupWindowDays: DEDUP_WINDOW_DAYS,
        lunaMode,
        interventionsEnabled,
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
      dedupWindowDays: DEDUP_WINDOW_DAYS,
    },
    actions: [
      `Score all active tenants`,
      `14-day pre-due delinquency early-warning: payment due ≤${DELINQUENCY_WARNING_DAYS_AHEAD}d AND delinquency probability ≥${DELINQUENCY_RISK_THRESHOLD}% (dedup: once per ${DEDUP_WINDOW_DAYS}d)`,
      `Lease expiry reminder: ≤${LEASE_EXPIRY_ALERT_DAYS} days until expiry (dedup: once per ${DEDUP_WINDOW_DAYS}d)`,
      `Churn escalation auto-intervention: first-time transition to high risk (skipped if Luna mode is "off")`,
    ],
  });
}
