import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import LunaSettings from "@/models/LunaSettings";
import { lunaAutonomousService, DEFAULT_LUNA_SETTINGS } from "@/lib/services/luna-autonomous.service";

const ALLOWED_ROLES: string[] = [UserRole.ADMIN, UserRole.MANAGER];

function isAuthorized(role?: string): boolean {
  return !!role && ALLOWED_ROLES.includes(role);
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    let settings = await LunaSettings.findOne().sort({ updatedAt: -1 }).lean();

    if (!settings) {
      settings = { ...DEFAULT_LUNA_SETTINGS } as any;
    }

    lunaAutonomousService.updateSettings(settings as any);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[Luna Settings GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: "Settings payload required" }, { status: 400 });
    }

    const allowedFields: Record<string, boolean> = {
      mode: true,
      confidenceThreshold: true,
      enabledCategories: true,
      digestEmailEnabled: true,
      digestEmailFrequency: true,
      maxActionsPerHour: true,
      humanReviewThreshold: true,
    };

    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(settings)) {
      if (allowedFields[key]) sanitized[key] = settings[key];
    }

    const updatedBy =
      (session.user as any).id ||
      session.user.email ||
      (session.user as any).name ||
      "unknown";

    await connectDB();
    const saved = await LunaSettings.findOneAndUpdate(
      {},
      { ...sanitized, updatedBy },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    lunaAutonomousService.updateSettings(sanitized as any);

    return NextResponse.json({
      success: true,
      settings: saved,
    });
  } catch (error) {
    console.error("[Luna Settings PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
