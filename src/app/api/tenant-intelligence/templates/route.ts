import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import { getAllTemplates } from "@/lib/services/intervention-templates.service";

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

  const templates = await getAllTemplates();
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
