/**
 * Luna Vendor Management API
 *
 * Manages the approved vendor pool used by Luna for autonomous work-order dispatch.
 * Only ADMIN and MANAGER roles can access these endpoints.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";

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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const approvedOnly = searchParams.get("approved") === "true";

    const query: Record<string, unknown> = {};
    if (category) query.categories = category;
    if (approvedOnly) query.isApproved = true;

    const vendors = await Vendor.find(query)
      .sort({ isApproved: -1, rating: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ vendors });
  } catch (error) {
    console.error("[Luna Vendors GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as Record<string, unknown>;
    const { name, contactName, email, phone, categories, isApproved, rating, responseTimeHours, hourlyRate, callOutFee, notes } = body;

    if (!name || !contactName || !email || !categories) {
      return NextResponse.json({ error: "name, contactName, email, and categories are required" }, { status: 400 });
    }

    await connectDB();

    const vendor = await Vendor.create({
      name,
      contactName,
      email,
      phone,
      categories,
      isApproved: isApproved ?? false,
      rating: rating ?? 0,
      responseTimeHours: responseTimeHours ?? 24,
      hourlyRate,
      callOutFee,
      notes,
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error("[Luna Vendors POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !isAuthorized(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as Record<string, unknown>;
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Vendor id is required" }, { status: 400 });
    }

    const allowedUpdates = ["name", "contactName", "email", "phone", "categories", "isApproved", "rating", "responseTimeHours", "hourlyRate", "callOutFee", "notes"];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (key in updates) sanitized[key] = updates[key];
    }

    await connectDB();

    const vendor = await Vendor.findByIdAndUpdate(id, sanitized, { new: true }).lean();
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error("[Luna Vendors PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
