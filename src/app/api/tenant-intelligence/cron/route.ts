/**
 * Nightly Tenant Intelligence Batch Scoring Cron
 *
 * Called by: external cron (e.g. every night at 02:00) or Vercel cron
 * Authorization: CRON_SECRET header or admin session
 *
 * Autonomy behavior (respects Luna settings):
 * - mode="full"       → auto-send notifications directly to tenants
 * - mode="supervised" → alert managers only; never auto-message tenants
 * - mode="off"        → skip all automated interventions entirely
 *
 * Thresholds are configurable via TenantIntelligenceSettings collection
 * (defaults fall back to constants if no record exists).
 *
 * Dedup: delinquency warnings and lease expiry alerts use 7-day window
 * to avoid repeat nightly notifications.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole, PaymentStatus } from "@/types";
import connectDB from "@/lib/mongodb";
import { computeAndPersistScores } from "@/lib/services/tenant-intelligence.service";
import { getTemplateById, selectTemplateForSignals } from "@/lib/services/intervention-templates.service";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";

const CRON_SECRET = process.env.TENANT_INTELLIGENCE_CRON_SECRET || process.env.CRON_SECRET;

// Default thresholds — overridden by configurable settings in DB
const DEFAULT_THRESHOLDS = {
  delinquencyRiskThreshold: 60,    // % delinquency probability to trigger warning
  delinquencyWarningDaysAhead: 14, // days until due to warn
  leaseExpiryAlertDays: 60,        // days until expiry to alert
  churnHighThreshold: 70,          // churnRiskScore >= this => high risk intervention
  dedupWindowDays: 7,              // days between repeat notifications
};

interface TenantIntelligenceThresholds {
  delinquencyRiskThreshold: number;
  delinquencyWarningDaysAhead: number;
  leaseExpiryAlertDays: number;
  churnHighThreshold: number;
  dedupWindowDays: number;
}

/**
 * Load configurable thresholds from LunaSettings or return defaults.
 *
 * NOTE: Thresholds are intentionally derived from LunaSettings for v1 so
 * managers configure risk tolerance once across all Luna-aware features.
 * confidenceThreshold → churnHighThreshold, humanReviewThreshold → delinquencyRiskThreshold.
 * A dedicated TenantIntelligenceSettings source can be introduced in a future iteration
 * to decouple these from the general Luna AI settings.
 */
async function loadThresholds(): Promise<TenantIntelligenceThresholds> {
  try {
    const LunaSettings = (await import("@/models/LunaSettings")).default;
    const settings = await LunaSettings.findOne()
      .select("mode confidenceThreshold humanReviewThreshold")
      .lean();
    if (settings) {
      const s = settings as unknown as {
        confidenceThreshold?: number;
        humanReviewThreshold?: number;
      };
      return {
        ...DEFAULT_THRESHOLDS,
        // Map Luna confidence thresholds to risk thresholds
        delinquencyRiskThreshold: s.humanReviewThreshold
          ? Math.round(s.humanReviewThreshold * 100)
          : DEFAULT_THRESHOLDS.delinquencyRiskThreshold,
        churnHighThreshold: s.confidenceThreshold
          ? Math.round(s.confidenceThreshold * 100)
          : DEFAULT_THRESHOLDS.churnHighThreshold,
      };
    }
  } catch {
    // fall back to defaults
  }
  return { ...DEFAULT_THRESHOLDS };
}

async function getLunaAutonomyMode(): Promise<"full" | "supervised" | "off"> {
  try {
    const LunaSettings = (await import("@/models/LunaSettings")).default;
    const settings = await LunaSettings.findOne().select("mode").lean();
    if (settings && (settings as unknown as { mode: string }).mode) {
      return (settings as unknown as { mode: "full" | "supervised" | "off" }).mode;
    }
  } catch {
    // default to supervised if unknown
  }
  return "supervised";
}

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

    // Explicit preferences for TI cron notifications: disable SMS (always returns false → breaks boolean AND).
    // In-app + email are the correct channels; dedup/state decisions are gated on this send result.
    const TI_PREFS = { email: true, sms: false, push: true, inApp: true };

    // Load autonomy mode and configurable thresholds
    const lunaMode = await getLunaAutonomyMode();
    const thresholds = await loadThresholds();

    const tenants = await User.find({ role: UserRole.TENANT, deletedAt: null, isActive: true })
      .select("_id firstName lastName email moveInDate")
      .lean();

    const now = new Date();
    const warningWindowEnd = new Date(now);
    warningWindowEnd.setDate(warningWindowEnd.getDate() + thresholds.delinquencyWarningDaysAhead);
    const dedupWindowMs = thresholds.dedupWindowDays * 24 * 60 * 60 * 1000;

    // Get admin/manager IDs for supervised-mode alerts
    const managers = lunaMode === "supervised"
      ? await User.find({ role: { $in: [UserRole.ADMIN, UserRole.MANAGER] }, deletedAt: null, isActive: true })
          .select("_id")
          .lean()
      : [];
    const managerIds = managers.map((m) => (m as unknown as { _id: mongoose.Types.ObjectId })._id.toString());

    const results = {
      processed: 0,
      delinquencyWarnings: 0,
      leaseExpiryAlerts: 0,
      churnInterventions: 0,
      supervisedManagerAlerts: 0,
      skippedByDedup: 0,
      skippedByLuna: 0,
      errors: 0,
      lunaMode,
      thresholds,
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
          .select("churnRiskLevel churnRiskScore delinquencyProbabilityPct interventionSent lastDelinquencyWarnAt lastLeaseExpiryAlertAt signals")
          .lean();

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

        // Delinquency early warning: only when probability >= configurable threshold
        // and upcoming payment due within warning window
        if (score.delinquencyProbabilityPct >= thresholds.delinquencyRiskThreshold) {
          const recentlySentDelinquency =
            lastDelinquencyWarnAt !== null &&
            now.getTime() - lastDelinquencyWarnAt.getTime() < dedupWindowMs;

          if (recentlySentDelinquency) {
            results.skippedByDedup++;
          } else {
            const upcomingPayment = await Payment.findOne({
              tenantId: tt._id,
              dueDate: { $gte: now, $lte: warningWindowEnd },
              status: { $nin: [PaymentStatus.PAID, PaymentStatus.COMPLETED] },
              deletedAt: null,
            })
              .select("dueDate amount")
              .lean();

            if (upcomingPayment) {
              const dueDate = new Date((upcomingPayment as unknown as { dueDate: Date }).dueDate);
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

              let delinquencyNotified = false;
              try {
                if (lunaMode === "full") {
                  // Full autonomy: notify tenant directly
                  const sent = await notificationService.sendNotification({
                    type: NotificationType.PAYMENT_REMINDER,
                    priority: NotificationPriority.HIGH,
                    userId: tt._id.toString(),
                    title: "Upcoming Payment Reminder",
                    message: `Hi ${tt.firstName || "there"}, your rent payment is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}. Please ensure your payment is submitted on time to avoid any late fees.`,
                    preferences: TI_PREFS,
                    data: {
                      userEmail: tt.email,
                      userName: `${tt.firstName || ""} ${tt.lastName || ""}`.trim(),
                      daysUntilDue,
                    },
                  });
                  if (sent) { results.delinquencyWarnings++; delinquencyNotified = true; }
                } else if (lunaMode === "supervised" && managerIds.length > 0) {
                  // Supervised: alert managers, do NOT message tenant directly
                  const tenantFullName = `${tt.firstName || ""} ${tt.lastName || ""}`.trim();
                  let anySent = false;
                  for (const mgId of managerIds) {
                    const mgSent = await notificationService.sendNotification({
                      type: NotificationType.PAYMENT_REMINDER,
                      priority: NotificationPriority.HIGH,
                      userId: mgId,
                      title: `Delinquency Risk: ${tenantFullName}`,
                      message: `Tenant ${tenantFullName} has ${score.delinquencyProbabilityPct}% delinquency risk with a payment due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}. Manual follow-up recommended.`,
                      preferences: TI_PREFS,
                      data: { tenantName: tenantFullName, tenantEmail: tt.email, daysUntilDue },
                    });
                    if (mgSent) anySent = true;
                  }
                  if (anySent) { results.supervisedManagerAlerts++; delinquencyNotified = true; }
                } else if (lunaMode === "off") {
                  results.skippedByLuna++;
                }
              } catch {
                results.errors++;
              }

              // Only stamp dedup timestamp when a notification was actually dispatched
              if (delinquencyNotified) {
                await TenantIntelligence.findOneAndUpdate(
                  { tenantId: tt._id },
                  { $set: { lastDelinquencyWarnAt: now } }
                );
              }
            }
          }
        }

        // Lease expiry reminder (≤leaseExpiryAlertDays out)
        const daysUntilExpiry = score.signals.daysUntilLeaseExpiry;
        if (
          daysUntilExpiry !== null &&
          daysUntilExpiry > 0 &&
          daysUntilExpiry <= thresholds.leaseExpiryAlertDays
        ) {
          const recentlySentExpiry =
            lastLeaseExpiryAlertAt !== null &&
            now.getTime() - lastLeaseExpiryAlertAt.getTime() < dedupWindowMs;

          if (recentlySentExpiry) {
            results.skippedByDedup++;
          } else {
            let leaseExpiryNotified = false;
            try {
              const leaseFullName = `${tt.firstName || ""} ${tt.lastName || ""}`.trim();
              if (lunaMode === "full") {
                // Full autonomy: notify tenant
                const leaseSent = await notificationService.sendNotification({
                  type: NotificationType.LEASE_EXPIRY,
                  priority: NotificationPriority.NORMAL,
                  userId: tt._id.toString(),
                  title: "Your Lease Expires Soon",
                  message: `Hi ${tt.firstName || "there"}, your lease expires in ${daysUntilExpiry} days. Please contact your property manager to discuss renewal options.`,
                  preferences: TI_PREFS,
                  data: {
                    userEmail: tt.email,
                    userName: leaseFullName,
                    daysUntilExpiry,
                  },
                });
                if (leaseSent) { results.leaseExpiryAlerts++; leaseExpiryNotified = true; }
              } else if (lunaMode === "supervised" && managerIds.length > 0) {
                // Supervised: alert managers
                let anyLeaseSent = false;
                for (const mgId of managerIds) {
                  const mgLeaseSent = await notificationService.sendNotification({
                    type: NotificationType.LEASE_EXPIRY,
                    priority: NotificationPriority.NORMAL,
                    userId: mgId,
                    title: `Lease Expiring: ${leaseFullName}`,
                    message: `Tenant ${leaseFullName}'s lease expires in ${daysUntilExpiry} days. Review renewal status and follow up.`,
                    preferences: TI_PREFS,
                    data: { tenantName: leaseFullName, tenantEmail: tt.email, daysUntilExpiry },
                  });
                  if (mgLeaseSent) anyLeaseSent = true;
                }
                if (anyLeaseSent) { results.supervisedManagerAlerts++; leaseExpiryNotified = true; }
              } else if (lunaMode === "off") {
                results.skippedByLuna++;
              }
            } catch {
              results.errors++;
            }

            // Only stamp dedup timestamp when a notification was actually dispatched
            if (leaseExpiryNotified) {
              await TenantIntelligence.findOneAndUpdate(
                { tenantId: tt._id },
                { $set: { lastLeaseExpiryAlertAt: now } }
              );
            }
          }
        }

        // Churn escalation: first-time crossing from non-high → high risk
        // Use configurable churnHighThreshold so manager settings actually govern when intervention fires
        const prevChurnHighRisk = (prevRecord?.churnRiskScore ?? 0) >= thresholds.churnHighThreshold;
        const churnEscalated =
          score.churnRiskScore >= thresholds.churnHighThreshold && !prevChurnHighRisk && !prevInterventionSent;

        if (churnEscalated) {
          try {
            if (lunaMode === "off") {
              results.skippedByLuna++;
            } else if (lunaMode === "supervised") {
              // Supervised: alert managers only, do NOT message tenant
              const churnFullName = `${tt.firstName || ""} ${tt.lastName || ""}`.trim();
              let anyChurnMgrSent = false;
              for (const mgId of managerIds) {
                const mgChurnSent = await notificationService.sendNotification({
                  type: NotificationType.SYSTEM_ANNOUNCEMENT,
                  priority: NotificationPriority.HIGH,
                  userId: mgId,
                  title: `High Churn Risk: ${churnFullName}`,
                  message: `Tenant ${churnFullName} has escalated to HIGH churn risk (score: ${score.churnRiskScore}/100). Consider sending a retention offer or scheduling a call.`,
                  preferences: TI_PREFS,
                  data: { tenantName: churnFullName, tenantEmail: tt.email, churnScore: score.churnRiskScore },
                });
                if (mgChurnSent) anyChurnMgrSent = true;
              }
              if (anyChurnMgrSent) results.supervisedManagerAlerts++;

              await TenantIntelligence.findOneAndUpdate(
                { tenantId: tt._id },
                { $set: { interventionSent: true, interventionSentAt: now } }
              );
              results.churnInterventions++;
            } else if (lunaMode === "full") {
              // Full autonomy: select retention template via unified service (built-ins + manager-created)
              // High delinquency → payment_plan; lease expiring → checkin; else → checkin
              const templateId = selectTemplateForSignals({
                delinquencyHigh: score.delinquencyProbabilityPct >= thresholds.delinquencyRiskThreshold,
                leaseExpiringSoon:
                  score.signals.daysUntilLeaseExpiry !== null &&
                  score.signals.daysUntilLeaseExpiry > 0 &&
                  score.signals.daysUntilLeaseExpiry <= thresholds.leaseExpiryAlertDays,
              });
              const template = await getTemplateById(templateId);
              const interventionMsg = template?.message ?? "Your property manager would like to connect with you. Please reply at your convenience.";
              const interventionFullName = `${tt.firstName || ""} ${tt.lastName || ""}`.trim();
              const churnSent = await notificationService.sendNotification({
                type: NotificationType.SYSTEM_ANNOUNCEMENT,
                priority: NotificationPriority.HIGH,
                userId: tt._id.toString(),
                title: "We Value Your Tenancy",
                message: `Hi ${tt.firstName || "there"}, ${interventionMsg}`,
                preferences: TI_PREFS,
                data: {
                  userEmail: tt.email,
                  userName: interventionFullName,
                  templateId,
                  templateLabel: template?.label,
                },
              });

              if (churnSent) {
                await TenantIntelligence.findOneAndUpdate(
                  { tenantId: tt._id },
                  { $set: { interventionSent: true, interventionSentAt: now } }
                );
                results.churnInterventions++;
              }
            }
          } catch {
            results.errors++;
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
  const thresholds = await loadThresholds().catch(() => DEFAULT_THRESHOLDS);
  const lunaMode = await getLunaAutonomyMode().catch(() => "supervised");
  return NextResponse.json({
    description: "POST to run nightly tenant intelligence batch scorer.",
    lunaMode,
    thresholds,
    actions: [
      "Score all active tenants",
      "14-day pre-due delinquency early-warning with configurable risk threshold",
      "Lease expiry reminder with configurable days threshold",
      "Churn escalation alert on first-time high-risk crossing",
      "full=auto-send tenant notifications; supervised=manager-alert only; off=skip all",
    ],
  });
}
