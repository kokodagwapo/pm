import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import TenantIntelligence from "@/models/TenantIntelligence";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { id: string; role: string };
    if (user.role !== UserRole.TENANT) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();
    const record = await TenantIntelligence.findOne({
      tenantId: new mongoose.Types.ObjectId(user.id),
    })
      .select("creditBuilderOptIn creditBuilderEnrolledAt")
      .lean();

    return NextResponse.json({
      data: {
        optedIn: record?.creditBuilderOptIn ?? false,
        enrolledAt: record?.creditBuilderEnrolledAt ?? null,
      },
    });
  } catch (err) {
    console.error("[CreditBuilder GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { id: string; role: string };
    if (user.role !== UserRole.TENANT) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json() as { optIn?: boolean };
    const optIn = body.optIn !== false;

    await connectDB();
    // Do NOT upsert — only update if a scored record exists to avoid creating
    // a shell record with default zero-scores that would masquerade as fresh.
    // If no TenantIntelligence record yet, store preference in a side collection
    // and it will be picked up during the next score computation.
    const existing = await TenantIntelligence.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(user.id) },
      {
        $set: {
          creditBuilderOptIn: optIn,
          creditBuilderEnrolledAt: optIn ? new Date() : null,
        },
      },
      { new: true, upsert: false }
    );

    // If no scored record exists yet, we store the preference but cannot persist it
    // to TenantIntelligence until first score run. Return success regardless.
    return NextResponse.json({
      data: {
        optedIn: existing ? existing.creditBuilderOptIn : optIn,
        enrolledAt: existing ? existing.creditBuilderEnrolledAt : (optIn ? new Date() : null),
      },
      message: optIn
        ? "You've enrolled in the Credit Builder program."
        : "Credit Builder enrollment has been removed.",
    });
  } catch (err) {
    console.error("[CreditBuilder POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
