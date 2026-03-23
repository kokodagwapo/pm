import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { lunaAutonomousService, DEFAULT_LUNA_SETTINGS } from "@/lib/services/luna-autonomous.service";

const SETTINGS_KEY = "luna_autonomy_settings";
const settingsStore: Record<string, any> = {};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = settingsStore[SETTINGS_KEY] || lunaAutonomousService.getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[Luna Settings GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: "Settings payload required" }, { status: 400 });
    }

    lunaAutonomousService.updateSettings(settings);
    settingsStore[SETTINGS_KEY] = lunaAutonomousService.getSettings();

    return NextResponse.json({
      success: true,
      settings: lunaAutonomousService.getSettings(),
    });
  } catch (error) {
    console.error("[Luna Settings PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
