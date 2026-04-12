export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import { NotificationType, NotificationPriority } from "@/lib/notification-service";
import connectDB from "@/lib/mongodb";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";
import { getAllTemplates, getTemplateById } from "@/lib/services/intervention-templates.service";

async function requireManagerAuth() {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as { id: string; role: string };
  if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role as UserRole)) return null;
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireManagerAuth();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json() as { tenantId: string; offerId: string; customMessage?: string };
    const { tenantId, offerId, customMessage } = body;

    if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
      return NextResponse.json({ error: "Invalid tenant id" }, { status: 400 });
    }

    // Look up template from unified source (built-ins + manager-created DB templates)
    const offer = offerId ? await getTemplateById(offerId) : null;
    if (!offer && !customMessage) {
      return NextResponse.json({ error: "Invalid offer or missing message" }, { status: 400 });
    }

    await connectDB();

    const User = (await import("@/models/User")).default;
    const tenant = await User.findOne({
      _id: tenantId,
      role: UserRole.TENANT,
      deletedAt: null,
    })
      .select("_id firstName lastName email")
      .lean();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tt = tenant as unknown as { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string; email?: string };
    const message = customMessage ?? offer?.message ?? "";
    const label = offer?.label ?? "Custom Retention Offer";
    const tenantName = `${tt.firstName || ""} ${tt.lastName || ""}`.trim() || "Tenant";

    const { notificationService } = await import("@/lib/notification-service");
    await notificationService.sendNotification({
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      priority: NotificationPriority.NORMAL,
      userId: tenantId,
      title: `Retention Offer: ${label}`,
      message: `Hi ${tt.firstName || "there"}, ${message}`,
      data: {
        userEmail: tt.email,
        userName: tenantName,
        templateId: offerId,
        templateLabel: label,
      },
    });

    // Do NOT upsert — only update if a scored record already exists to avoid
    // creating a shell record with default zero-scores masquerading as fresh.
    await TenantIntelligence.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(tenantId) },
      {
        $set: {
          interventionSent: true,
          interventionSentAt: new Date(),
        },
      },
      { upsert: false }
    );

    return NextResponse.json({
      success: true,
      message: `Retention offer "${label}" sent to ${tt.firstName || "tenant"}.`,
    });
  } catch (err) {
    console.error("[TenantIntelligence Intervention POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!role || !["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Return unified templates (built-in + manager-created) from service
  const templates = await getAllTemplates();
  return NextResponse.json({ data: templates });
}
