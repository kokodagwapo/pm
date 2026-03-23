import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";

const BUILT_IN_TEMPLATES = [
  {
    id: "rent_freeze",
    label: "1-Month Rent Freeze",
    message:
      "We value your tenancy and would like to offer you a 1-month rent freeze as a gesture of appreciation. Your rent will remain unchanged for the next month — no action needed.",
    isBuiltIn: true,
  },
  {
    id: "parking_upgrade",
    label: "Parking Upgrade",
    message:
      "As a valued long-term resident, we'd like to offer you a complimentary parking space upgrade. Please contact us to arrange the details.",
    isBuiltIn: true,
  },
  {
    id: "appliance_credit",
    label: "$200 Appliance Upgrade Credit",
    message:
      "We're offering you a $200 appliance upgrade credit redeemable within the next 30 days. Contact your property manager to apply it to an eligible appliance upgrade.",
    isBuiltIn: true,
  },
  {
    id: "checkin",
    label: "Personal Check-In",
    message:
      "Your property manager would like to schedule a brief check-in call to make sure everything is going well. Please reply to let us know a convenient time.",
    isBuiltIn: true,
  },
  {
    id: "payment_plan",
    label: "Flexible Payment Plan",
    message:
      "We understand circumstances can change. We'd like to discuss a flexible payment arrangement to help you stay on track. Please reach out at your earliest convenience.",
    isBuiltIn: true,
  },
];

async function requireManagerAuth() {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as { id: string; role: string };
  if (![UserRole.ADMIN, UserRole.MANAGER].includes(user.role as UserRole)) return null;
  return user;
}

export async function GET() {
  const user = await requireManagerAuth();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const InterventionTemplate = (await import("@/models/InterventionTemplate")).default;
  const customTemplates = await InterventionTemplate.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();

  const templates = [
    ...BUILT_IN_TEMPLATES,
    ...customTemplates.map((t) => ({
      id: (t as unknown as { _id: { toString(): string } })._id.toString(),
      label: (t as unknown as { label: string }).label,
      message: (t as unknown as { message: string }).message,
      isBuiltIn: false,
    })),
  ];

  return NextResponse.json({ data: templates });
}

export async function POST(req: NextRequest) {
  const user = await requireManagerAuth();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as { label?: string; message?: string };
  if (!body.label?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "label and message are required" }, { status: 400 });
  }

  await connectDB();
  const InterventionTemplate = (await import("@/models/InterventionTemplate")).default;
  const template = await InterventionTemplate.create({
    label: body.label.trim(),
    message: body.message.trim(),
    createdBy: user.id,
  });

  return NextResponse.json({
    data: {
      id: template._id.toString(),
      label: template.label,
      message: template.message,
      isBuiltIn: false,
    },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await requireManagerAuth();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await connectDB();
  const InterventionTemplate = (await import("@/models/InterventionTemplate")).default;
  const mongoose = (await import("mongoose")).default;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await InterventionTemplate.findByIdAndUpdate(id, { deletedAt: new Date() });

  return NextResponse.json({ success: true });
}
