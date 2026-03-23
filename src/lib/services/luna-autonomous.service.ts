/**
 * Luna Autonomous Operations Agent Service
 * Evaluates property management triggers and takes autonomous actions
 * based on configurable autonomy settings and confidence thresholds.
 */

import dbConnect from "@/lib/db";
import LunaAutonomousAction, {
  LunaActionCategory,
  LunaActionStatus,
  LunaAutonomyMode,
} from "@/models/LunaAutonomousAction";
import {
  notificationService,
  NotificationType,
  NotificationPriority,
} from "@/lib/notification-service";

export interface LunaAutonomySettings {
  mode: LunaAutonomyMode;
  confidenceThreshold: number;
  enabledCategories: LunaActionCategory[];
  digestEmailEnabled: boolean;
  digestEmailFrequency: "daily" | "weekly";
  maxActionsPerHour: number;
  humanReviewThreshold: number;
}

export const DEFAULT_LUNA_SETTINGS: LunaAutonomySettings = {
  mode: "supervised",
  confidenceThreshold: 0.75,
  enabledCategories: [
    "payment_reminder",
    "maintenance_triage",
    "lease_renewal_notice",
    "lease_expiry_alert",
    "system_digest",
  ],
  digestEmailEnabled: true,
  digestEmailFrequency: "daily",
  maxActionsPerHour: 20,
  humanReviewThreshold: 0.6,
};

interface TriggerContext {
  entityType: "payment" | "lease" | "maintenance" | "tenant" | "property" | "system";
  entityId?: string;
  affectedUserId?: string;
  affectedPropertyId?: string;
  data: Record<string, any>;
}

interface LunaDecision {
  shouldAct: boolean;
  category: LunaActionCategory;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  actionsTaken: string[];
  notificationsSent: string[];
  humanReviewRequired: boolean;
  status: LunaActionStatus;
}

export class LunaAutonomousService {
  private settings: LunaAutonomySettings;
  private actionCountThisHour: number = 0;
  private hourWindowStart: Date = new Date();

  constructor(settings: Partial<LunaAutonomySettings> = {}) {
    this.settings = { ...DEFAULT_LUNA_SETTINGS, ...settings };
  }

  updateSettings(settings: Partial<LunaAutonomySettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  getSettings(): LunaAutonomySettings {
    return { ...this.settings };
  }

  private resetHourWindowIfNeeded(): void {
    const now = new Date();
    if (now.getTime() - this.hourWindowStart.getTime() > 3600000) {
      this.actionCountThisHour = 0;
      this.hourWindowStart = now;
    }
  }

  private canExecuteMoreActions(): boolean {
    this.resetHourWindowIfNeeded();
    return this.actionCountThisHour < this.settings.maxActionsPerHour;
  }

  private isCategoryEnabled(category: LunaActionCategory): boolean {
    return this.settings.enabledCategories.includes(category);
  }

  async evaluateOverduePayment(
    context: TriggerContext & {
      data: {
        tenantName: string;
        tenantEmail: string;
        propertyName: string;
        amount: number;
        daysOverdue: number;
        paymentId: string;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    const { tenantName, tenantEmail, propertyName, amount, daysOverdue } = data;

    const category: LunaActionCategory =
      daysOverdue > 14 ? "payment_escalation" : "payment_reminder";

    if (!this.isCategoryEnabled(category)) return null;

    const confidence = daysOverdue > 7 ? 0.92 : daysOverdue > 3 ? 0.85 : 0.78;
    const humanReviewRequired =
      confidence < this.settings.humanReviewThreshold || daysOverdue > 30;

    const decision: LunaDecision = {
      shouldAct: confidence >= this.settings.confidenceThreshold,
      category,
      title:
        daysOverdue > 14
          ? `Payment Escalation — ${tenantName}`
          : `Automated Payment Reminder — ${tenantName}`,
      description: `${tenantName} has an overdue payment of $${amount.toFixed(2)} for ${propertyName}. ${daysOverdue} days overdue.`,
      reasoning: `Confidence score ${(confidence * 100).toFixed(0)}% based on ${daysOverdue} days overdue. ${
        daysOverdue > 14
          ? "Escalation triggered as overdue exceeds 14 days."
          : "Standard reminder cadence triggered."
      }`,
      confidence,
      actionsTaken: [],
      notificationsSent: [],
      humanReviewRequired,
      status: "evaluated",
    };

    if (decision.shouldAct && this.settings.mode !== "off" && this.canExecuteMoreActions()) {
      if (this.settings.mode === "full" || !humanReviewRequired) {
        try {
          await notificationService.sendNotification({
            type:
              daysOverdue > 14
                ? NotificationType.PAYMENT_OVERDUE
                : NotificationType.PAYMENT_REMINDER,
            priority:
              daysOverdue > 14 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
            userId: context.affectedUserId || "",
            title: decision.title,
            message: decision.description,
            data: {
              userEmail: tenantEmail,
              userName: tenantName,
              propertyName,
              rentAmount: amount,
              daysOverdue,
              amount,
            },
          });
          decision.actionsTaken.push("payment_notification_sent");
          decision.notificationsSent.push(`email:${tenantEmail}`);
          decision.status = "executed";
          this.actionCountThisHour++;
        } catch {
          decision.status = "failed";
        }
      } else {
        decision.status = "pending_human";
      }
    } else if (!decision.shouldAct) {
      decision.status = "skipped";
    }

    return this.logAction(decision, context, "payment_overdue_trigger");
  }

  async evaluateMaintenanceRequest(
    context: TriggerContext & {
      data: {
        requestId: string;
        tenantName: string;
        tenantEmail: string;
        propertyName: string;
        category: string;
        priority: string;
        description: string;
        daysSinceSubmission: number;
        isEmergency: boolean;
        managerEmail?: string;
        managerName?: string;
        managerId?: string;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    const actionCategory: LunaActionCategory = data.isEmergency
      ? "maintenance_escalation"
      : "maintenance_triage";

    if (!this.isCategoryEnabled(actionCategory)) return null;

    const baseConfidence = data.isEmergency ? 0.95 : 0.82;
    const confidence =
      data.daysSinceSubmission > 3 && !data.isEmergency
        ? Math.min(baseConfidence + 0.05, 0.98)
        : baseConfidence;

    const humanReviewRequired = !data.isEmergency && confidence < this.settings.humanReviewThreshold;

    const decision: LunaDecision = {
      shouldAct: confidence >= this.settings.confidenceThreshold,
      category: actionCategory,
      title: data.isEmergency
        ? `Emergency Maintenance Alert — ${data.propertyName}`
        : `Maintenance Triage — ${data.category} (${data.priority})`,
      description: `${data.tenantName} submitted a ${data.priority} priority ${data.category} request for ${data.propertyName}. ${data.isEmergency ? "EMERGENCY — immediate response required." : `${data.daysSinceSubmission} days since submission.`}`,
      reasoning: `${data.isEmergency ? "Emergency flag set." : `Priority: ${data.priority}, ${data.daysSinceSubmission} days elapsed.`} Confidence ${(confidence * 100).toFixed(0)}%. ${data.isEmergency ? "Auto-escalation to manager is warranted." : "Triage notification to tenant warranted."}`,
      confidence,
      actionsTaken: [],
      notificationsSent: [],
      humanReviewRequired,
      status: "evaluated",
    };

    if (decision.shouldAct && this.settings.mode !== "off" && this.canExecuteMoreActions()) {
      if (this.settings.mode === "full" || !humanReviewRequired) {
        try {
          await notificationService.sendNotification({
            type: NotificationType.MAINTENANCE_UPDATE,
            priority: data.isEmergency ? NotificationPriority.CRITICAL : NotificationPriority.NORMAL,
            userId: context.affectedUserId || "",
            title: decision.title,
            message: decision.description,
            data: {
              userEmail: data.tenantEmail,
              userName: data.tenantName,
              requestId: data.requestId,
              propertyName: data.propertyName,
              status: data.isEmergency ? "emergency_escalated" : "triaged",
              description: data.description,
              notes: data.isEmergency
                ? "Luna has auto-escalated this emergency request to the property manager."
                : "Luna has reviewed and triaged your maintenance request.",
            },
          });
          decision.actionsTaken.push("maintenance_notification_sent");
          decision.notificationsSent.push(`email:${data.tenantEmail}`);

          if (data.isEmergency && data.managerEmail && context.affectedUserId) {
            await notificationService.sendNotification({
              type: NotificationType.MAINTENANCE_EMERGENCY,
              priority: NotificationPriority.CRITICAL,
              userId: data.managerId || context.affectedUserId,
              title: `EMERGENCY: ${data.category} at ${data.propertyName}`,
              message: `Tenant ${data.tenantName} reported an emergency: ${data.description}`,
              data: {
                userEmail: data.managerEmail,
                userName: data.managerName || "Property Manager",
                requestId: data.requestId,
                propertyName: data.propertyName,
                status: "emergency",
                description: data.description,
              },
            });
            decision.actionsTaken.push("manager_emergency_alert_sent");
            decision.notificationsSent.push(`email:${data.managerEmail}`);
          }

          decision.status = "executed";
          this.actionCountThisHour++;
        } catch {
          decision.status = "failed";
        }
      } else {
        decision.status = "pending_human";
      }
    } else if (!decision.shouldAct) {
      decision.status = "skipped";
    }

    return this.logAction(decision, context, "maintenance_submitted_trigger");
  }

  async evaluateLeaseExpiry(
    context: TriggerContext & {
      data: {
        leaseId: string;
        tenantName: string;
        tenantEmail: string;
        propertyName: string;
        expiryDate: Date;
        daysUntilExpiry: number;
        managerEmail?: string;
        managerName?: string;
        managerId?: string;
        isLandlord?: boolean;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    const { daysUntilExpiry } = data;

    const actionCategory: LunaActionCategory =
      daysUntilExpiry <= 30 ? "lease_expiry_alert" : "lease_renewal_notice";

    if (!this.isCategoryEnabled(actionCategory)) return null;

    const confidence =
      daysUntilExpiry <= 14 ? 0.95 : daysUntilExpiry <= 30 ? 0.88 : 0.8;

    const humanReviewRequired = confidence < this.settings.humanReviewThreshold;

    const decision: LunaDecision = {
      shouldAct: confidence >= this.settings.confidenceThreshold,
      category: actionCategory,
      title:
        daysUntilExpiry <= 30
          ? `Lease Expiry Alert — ${data.tenantName}`
          : `Lease Renewal Notice — ${data.tenantName}`,
      description: `Lease for ${data.tenantName} at ${data.propertyName} expires in ${daysUntilExpiry} days (${data.expiryDate.toLocaleDateString()}).`,
      reasoning: `${daysUntilExpiry} days until lease expiry. Confidence ${(confidence * 100).toFixed(0)}%. ${
        daysUntilExpiry <= 30
          ? "Critical window — lease expiry alert required."
          : "Standard renewal outreach window."
      }`,
      confidence,
      actionsTaken: [],
      notificationsSent: [],
      humanReviewRequired,
      status: "evaluated",
    };

    if (decision.shouldAct && this.settings.mode !== "off" && this.canExecuteMoreActions()) {
      if (this.settings.mode === "full" || !humanReviewRequired) {
        try {
          await notificationService.sendNotification({
            type: NotificationType.LEASE_EXPIRY,
            priority:
              daysUntilExpiry <= 14 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
            userId: context.affectedUserId || "",
            title: decision.title,
            message: decision.description,
            data: {
              userEmail: data.tenantEmail,
              userName: data.tenantName,
              propertyName: data.propertyName,
              expiryDate: data.expiryDate.toISOString(),
              daysUntilExpiry,
              leaseId: data.leaseId,
              isLandlord: false,
            },
          });
          decision.actionsTaken.push("tenant_lease_notice_sent");
          decision.notificationsSent.push(`email:${data.tenantEmail}`);

          if (data.managerEmail && data.managerId) {
            await notificationService.sendNotification({
              type: NotificationType.LEASE_EXPIRY,
              priority:
                daysUntilExpiry <= 14 ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
              userId: data.managerId,
              title: `[Manager] Lease Expiry — ${data.tenantName}`,
              message: decision.description,
              data: {
                userEmail: data.managerEmail,
                userName: data.managerName || "Property Manager",
                propertyName: data.propertyName,
                tenantName: data.tenantName,
                expiryDate: data.expiryDate.toISOString(),
                daysUntilExpiry,
                leaseId: data.leaseId,
                isLandlord: true,
              },
            });
            decision.actionsTaken.push("manager_lease_alert_sent");
            decision.notificationsSent.push(`email:${data.managerEmail}`);
          }

          decision.status = "executed";
          this.actionCountThisHour++;
        } catch {
          decision.status = "failed";
        }
      } else {
        decision.status = "pending_human";
      }
    } else if (!decision.shouldAct) {
      decision.status = "skipped";
    }

    return this.logAction(decision, context, "lease_expiry_trigger");
  }

  async generateSystemDigest(
    context: TriggerContext & {
      data: {
        propertyCount: number;
        activeLeaseCount: number;
        overduePaymentCount: number;
        overduePaymentTotal: number;
        openMaintenanceCount: number;
        emergencyMaintenanceCount: number;
        expiringLeasesCount: number;
        actionsExecutedToday: number;
        managerEmail?: string;
        managerName?: string;
        managerId?: string;
      };
    }
  ): Promise<ILunaDecisionRecord | null> {
    const { data } = context;
    if (!this.isCategoryEnabled("system_digest")) return null;

    const hasAlerts =
      data.emergencyMaintenanceCount > 0 ||
      data.overduePaymentCount > 3 ||
      data.expiringLeasesCount > 0;

    const confidence = 0.98;
    const decision: LunaDecision = {
      shouldAct: true,
      category: "system_digest",
      title: `Daily Operations Digest — ${new Date().toLocaleDateString()}`,
      description: `Portfolio summary: ${data.propertyCount} properties, ${data.activeLeaseCount} active leases, ${data.overduePaymentCount} overdue payments ($${data.overduePaymentTotal.toFixed(0)}), ${data.openMaintenanceCount} open maintenance requests (${data.emergencyMaintenanceCount} emergency), ${data.expiringLeasesCount} leases expiring within 60 days.`,
      reasoning: `Daily digest generated at ${new Date().toLocaleTimeString()}. ${hasAlerts ? "⚠ Alerts present that require attention." : "All metrics within normal ranges."}`,
      confidence,
      actionsTaken: ["digest_generated"],
      notificationsSent: [],
      humanReviewRequired: false,
      status: "executed",
    };

    if (data.managerEmail && this.settings.digestEmailEnabled) {
      try {
        await notificationService.sendNotification({
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          priority: hasAlerts ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
          userId: data.managerId || "",
          title: decision.title,
          message: decision.description,
          data: {
            userEmail: data.managerEmail,
            userName: data.managerName || "Property Manager",
            ...data,
          },
        });
        decision.notificationsSent.push(`email:${data.managerEmail}`);
      } catch {
        // digest email is best-effort
      }
    }

    return this.logAction(decision, context, "daily_digest_trigger");
  }

  private async logAction(
    decision: LunaDecision,
    context: TriggerContext,
    triggerEvent: string
  ): Promise<ILunaDecisionRecord | null> {
    try {
      await dbConnect();
      const record = await LunaAutonomousAction.create({
        category: decision.category,
        status: decision.status,
        title: decision.title,
        description: decision.description,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        triggerEvent,
        triggerEntityType: context.entityType,
        triggerEntityId: context.entityId,
        affectedUserId: context.affectedUserId,
        affectedPropertyId: context.affectedPropertyId,
        actionsTaken: decision.actionsTaken,
        notificationsSent: decision.notificationsSent,
        humanReviewRequired: decision.humanReviewRequired,
        executedAt: decision.status === "executed" ? new Date() : undefined,
        metadata: context.data,
      });
      return record as ILunaDecisionRecord;
    } catch (err) {
      console.error("[Luna] Failed to log autonomous action:", err);
      return null;
    }
  }

  async getRecentActions(limit = 50, category?: LunaActionCategory, status?: LunaActionStatus) {
    await dbConnect();
    const filter: Record<string, any> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    return LunaAutonomousAction.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async getActionStats() {
    await dbConnect();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [totalToday, totalWeek, executedToday, pendingHuman, failedTotal] = await Promise.all([
      LunaAutonomousAction.countDocuments({ createdAt: { $gte: todayStart } }),
      LunaAutonomousAction.countDocuments({ createdAt: { $gte: weekStart } }),
      LunaAutonomousAction.countDocuments({ createdAt: { $gte: todayStart }, status: "executed" }),
      LunaAutonomousAction.countDocuments({ status: "pending_human" }),
      LunaAutonomousAction.countDocuments({ status: "failed" }),
    ]);

    const totalExecuted = await LunaAutonomousAction.countDocuments({ status: "executed" });
    const totalAll = await LunaAutonomousAction.countDocuments();
    const successRate = totalAll > 0 ? totalExecuted / totalAll : 0;

    return {
      totalToday,
      totalWeek,
      executedToday,
      pendingHuman,
      failedTotal,
      successRate,
    };
  }

  async markHumanReviewed(
    actionId: string,
    reviewedBy: string,
    notes: string,
    approve: boolean
  ) {
    await dbConnect();
    return LunaAutonomousAction.findByIdAndUpdate(
      actionId,
      {
        status: approve ? "executed" : "skipped",
        humanReviewNotes: notes,
        humanReviewedAt: new Date(),
        humanReviewedBy: reviewedBy,
        executedAt: approve ? new Date() : undefined,
      },
      { new: true }
    );
  }
}

export interface ILunaDecisionRecord {
  _id: string;
  category: LunaActionCategory;
  status: LunaActionStatus;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  humanReviewRequired: boolean;
  executedAt?: Date;
  createdAt: Date;
}

export const lunaAutonomousService = new LunaAutonomousService();
