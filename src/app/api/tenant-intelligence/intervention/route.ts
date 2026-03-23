import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import { NotificationType, NotificationPriority } from "@/lib/notification-service";
import connectDB from "@/lib/mongodb";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";

const OFFER_TEMPLATES = {
  rent_freeze: {
    id: "rent_freeze",
    label: "1-Month Rent Freeze",
    message:
      "We value your tenancy and would like to offer you a 1-month rent freeze as a gesture of appreciation. Your rent will remain unchanged for the next month — no action needed.",
  },
  parking_upgrade: {
    id: "parking_upgrade",
    label: "Parking Upgrade",
    message:
      "As a valued long-term resident, we'd like to offer you a complimentary parking space upgrade. Please contact us to arrange the details.",
  },
  appliance_credit: {
    id: "appliance_credit",
    label: "$200 Appliance Upgrade Credit",
    message:
      "We're offering you a $200 appliance upgrade credit redeemable within the next 30 days. Contact your property manager to apply it to an eligible appliance upgrade.",
  },
  checkin: {
    id: "checkin",
    label: "Personal Check-In",
    message:
      "Your property manager would like to schedule a brief check-in call to make sure everything is going well. Please reply to let us know a convenient time.",
  },
  payment_plan: {
    id: "payment_plan",
    label: "Flexible Payment Plan",
    message:
      "We understand circumstances can change. We'd like to discuss a flexible payment arrangement to help you stay on track. Please reach out at your earliest convenience.",
  },
};

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

    const offer = OFFER_TEMPLATES[offerId as keyof typeof OFFER_TEMPLATES];
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
      .select("_id firstName lastName")
      .lean();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const tt = tenant as unknown as { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string };
    const message = customMessage ?? offer?.message ?? "";
    const label = offer?.label ?? "Custom Retention Offer";

    const { notificationService } = await import("@/lib/notification-service");
    await notificationService.sendNotification({
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      priority: NotificationPriority.NORMAL,
      userId: tenantId,
      title: `Retention Offer: ${label}`,
      message,
    });

    await TenantIntelligence.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(tenantId) },
      {
        $set: {
          interventionSent: true,
          interventionSentAt: new Date(),
        },
      },
      { upsert: true }
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
  return NextResponse.json({ data: Object.values(OFFER_TEMPLATES) });
}
