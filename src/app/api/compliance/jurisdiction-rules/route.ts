import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import JurisdictionRule from "@/models/JurisdictionRule";

interface SessionUser {
  id: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const stateCode = searchParams.get("stateCode");
    const category = searchParams.get("category");

    const query: Record<string, unknown> = { isActive: true };
    if (stateCode) query.stateCode = stateCode.toUpperCase();
    if (category) query.category = category;

    const rules = await JurisdictionRule.find(query).sort({ stateCode: 1, category: 1 }).lean();

    return NextResponse.json({ rules, total: rules.length });
  } catch (error) {
    console.error("Error fetching jurisdiction rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = session.user as SessionUser;
    if (!["admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const data = await request.json();

    const rule = await JurisdictionRule.create(data);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("Error creating jurisdiction rule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
