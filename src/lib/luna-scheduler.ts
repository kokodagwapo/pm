/**
 * Luna Background Scheduler
 *
 * Runs the Luna autonomous trigger engine on a fixed interval in the
 * Node.js server process (dev and production). The scheduler is initialized
 * once per server lifecycle via the Next.js instrumentation hook.
 *
 * Interval: every 30 minutes by default (configurable via LUNA_INTERVAL_MS).
 * Each run polls the DB for actionable triggers and invokes the Luna service.
 */

import connectDB from "@/lib/mongodb";

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const DIGEST_DAILY_MS = 24 * 60 * 60 * 1000;
const DIGEST_WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;

let schedulerStarted = false;
let lastDigestSentAt: Date | null = null;

async function runLunaTriggerCycle(): Promise<void> {
  try {
    await connectDB();

    const Payment = (await import("@/models/Payment")).default;
    const Lease = (await import("@/models/Lease")).default;
    const MaintenanceRequest = (await import("@/models/MaintenanceRequest")).default;
    const Conversation = (await import("@/models/Conversation")).default;
    const Message = (await import("@/models/Message")).default;
    const LunaSettings = (await import("@/models/LunaSettings")).default;
    const { lunaAutonomousService, DEFAULT_LUNA_SETTINGS } = await import(
      "@/lib/services/luna-autonomous.service"
    );
    const { PaymentStatus, LeaseStatus, MaintenancePriority, MaintenanceStatus, UserRole } =
      await import("@/types");

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
      console.log("[Luna Scheduler] Mode is off — skipping cycle.");
      return;
    }

    const now = new Date();

    // 1. Overdue payments
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
    }

    // 2. Expiring leases
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
      // Milestone-based idempotent key: prevents re-triggering daily within same milestone window
      const leaseMilestone = daysUntilExpiry <= 15 ? "15d" : daysUntilExpiry <= 30 ? "30d" : "60d";
      const leaseEntityId = `${String(lease._id)}_${leaseMilestone}`;

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
          tenantResponse: null,
        },
      });
    }

    // 3. Maintenance requests unassigned >4h
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
    }

    // 4. Emergency maintenance (last 2h)
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
    }

    // 5. Unanswered messages >24h
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
    }

    // 6. System digest (daily or weekly, dedup via lastDigestSentAt)
    const digestFrequency = currentSettings.digestEmailFrequency;
    const digestIntervalMs = digestFrequency === "weekly" ? DIGEST_WEEKLY_MS : DIGEST_DAILY_MS;
    const shouldSendDigest =
      currentSettings.digestEmailEnabled &&
      (!lastDigestSentAt || now.getTime() - lastDigestSentAt.getTime() >= digestIntervalMs);

    if (shouldSendDigest) {
      try {
        const User = (await import("@/models/User")).default;
        const { UserRole } = await import("@/types");

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
          (await import("@/models/Property")).default.countDocuments({ deletedAt: null }),
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
            endDate: { $lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), $gte: now },
          }),
          (await import("@/models/LunaAutonomousAction")).default.countDocuments({
            status: "executed",
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
          }),
        ]);

        const overduePaymentTotal = (overduePaymentAgg as Array<{ total: number }>)[0]?.total || 0;

        const managers = await User.find({
          role: { $in: [UserRole.ADMIN, UserRole.MANAGER] },
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
                  managerName: `${mgr.firstName || ""} ${mgr.lastName || ""}`.trim(),
                  managerId: String(mgr._id),
                },
              })
            )
          );
          lastDigestSentAt = now;
          console.log(`[Luna Scheduler] Digest sent to ${managers.length} managers at ${now.toISOString()}`);
        }
      } catch (digestErr) {
        console.error("[Luna Scheduler] Digest error:", digestErr);
      }
    }

    console.log(`[Luna Scheduler] Cycle complete at ${now.toISOString()}`);
  } catch (err) {
    console.error("[Luna Scheduler] Error in trigger cycle:", err);
  }
}

export function startLunaScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const intervalMs = Number(process.env.LUNA_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

  console.log(`[Luna Scheduler] Starting — interval: ${intervalMs / 60000} min`);

  setTimeout(async () => {
    await runLunaTriggerCycle();
    setInterval(runLunaTriggerCycle, intervalMs);
  }, 5000);
}
