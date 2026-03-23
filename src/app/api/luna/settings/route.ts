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
  void req;
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const settings = await LunaSettings.findOne().sort({ updatedAt: -1 }).lean();

    if (!settings) {
      return NextResponse.json({ settings: DEFAULT_LUNA_SETTINGS });
    }

    lunaAutonomousService.updateSettings({
      mode: settings.mode,
      confidenceThreshold: settings.confidenceThreshold,
      enabledCategories: settings.enabledCategories as never[],
      digestEmailEnabled: settings.digestEmailEnabled,
      digestEmailFrequency: settings.digestEmailFrequency,
      maxActionsPerHour: settings.maxActionsPerHour,
      humanReviewThreshold: settings.humanReviewThreshold,
      spendingLimit: settings.spendingLimit ?? DEFAULT_LUNA_SETTINGS.spendingLimit,
      escalationContacts: (settings.escalationContacts ?? []) as never[],
      roleAutonomyConfig: (settings.roleAutonomyConfig ?? DEFAULT_LUNA_SETTINGS.roleAutonomyConfig) as never[],
    });

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

    const body = await req.json() as { settings?: Record<string, unknown> };
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: "Settings payload required" }, { status: 400 });
    }

    const allowedFields = new Set([
      "mode",
      "confidenceThreshold",
      "enabledCategories",
      "digestEmailEnabled",
      "digestEmailFrequency",
      "maxActionsPerHour",
      "humanReviewThreshold",
      "spendingLimit",
      "escalationContacts",
      "roleAutonomyConfig",
    ]);

    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(settings)) {
      if (allowedFields.has(key)) sanitized[key] = settings[key];
    }

    const updatedBy: string =
      (session.user as { id?: string }).id ||
      session.user.email ||
      (session.user as { name?: string }).name ||
      "unknown";

    await connectDB();
    const saved = await LunaSettings.findOneAndUpdate(
      {},
      { ...sanitized, updatedBy },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    lunaAutonomousService.updateSettings(sanitized as Parameters<typeof lunaAutonomousService.updateSettings>[0]);

    return NextResponse.json({
      success: true,
      settings: saved,
    });
  } catch (error) {
    console.error("[Luna Settings PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
