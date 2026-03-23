import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ComplianceObligation from "@/models/ComplianceObligation";
import User from "@/models/User";
import {
  notificationService,
  NotificationType,
  NotificationPriority,
} from "@/lib/notification-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const isSystemCall = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isDev = process.env.NODE_ENV !== "production";

    if (!isSystemCall && !isDev) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const results = {
      overdue: 0,
      reminded14: 0,
      reminded3: 0,
      errors: 0,
    };

    // Mark overdue obligations
    const overdueResult = await ComplianceObligation.updateMany(
      {
        isActive: true,
        status: { $in: ["pending", "in_progress"] },
        dueDate: { $lt: now },
      },
      { $set: { status: "overdue" } }
    );
    results.overdue = overdueResult.modifiedCount;

    // Find obligations due in 14 or 3 days and send reminders
    for (const daysBefore of [14, 3]) {
      const targetStart = new Date(now);
      targetStart.setDate(targetStart.getDate() + daysBefore);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetStart);
      targetEnd.setDate(targetEnd.getDate() + 1);

      const obligations = await ComplianceObligation.find({
        isActive: true,
        status: { $nin: ["completed", "waived", "not_applicable", "overdue"] },
        dueDate: { $gte: targetStart, $lt: targetEnd },
      }).populate("propertyId", "name ownerId managerId");

      for (const obligation of obligations) {
        try {
          const property = obligation.propertyId as any;
          if (!property) continue;

          const recipientIds = new Set<string>();
          if (obligation.assignedTo) recipientIds.add(obligation.assignedTo.toString());
          if (property.ownerId) recipientIds.add(property.ownerId.toString());
          if (property.managerId) recipientIds.add(property.managerId.toString());

          for (const recipientId of recipientIds) {
            if (!recipientId) continue;
            const user = await User.findById(recipientId).select("firstName lastName email").lean() as any;
            if (!user?.email) continue;

            await notificationService.sendNotification({
              type: NotificationType.SYSTEM_ANNOUNCEMENT,
              priority: obligation.severity === "critical" ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
              userId: recipientId,
              title: `Compliance Deadline in ${daysBefore} Days`,
              message: `"${obligation.title}" is due in ${daysBefore} days for ${property.name}`,
              preferences: { email: true, sms: false, push: true, inApp: true },
              data: {
                userEmail: user.email,
                userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
                actionUrl: "/dashboard/compliance",
                propertyName: property.name,
                category: obligation.category,
                severity: obligation.severity,
                dueDate: obligation.dueDate?.toISOString(),
              },
            });
          }

          if (daysBefore === 14) results.reminded14++;
          else results.reminded3++;

          await ComplianceObligation.findByIdAndUpdate(obligation._id, { reminderSentAt: now });
        } catch (err) {
          console.error(`Error sending compliance reminder for obligation ${obligation._id}:`, err);
          results.errors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error) {
    console.error("Compliance cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
