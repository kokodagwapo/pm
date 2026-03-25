import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import mongoose from "mongoose";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: string };
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid vendor ID" }, { status: 400 });
    }

    await connectDB();

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const issues: string[] = [];
    let shouldHold = false;

    if (vendor.licenseExpiryDate) {
      if (vendor.licenseExpiryDate < now) {
        issues.push(`Contractor license expired on ${vendor.licenseExpiryDate.toLocaleDateString()}`);
        shouldHold = true;
      } else if (vendor.licenseExpiryDate < thirtyDays) {
        issues.push(`Contractor license expires on ${vendor.licenseExpiryDate.toLocaleDateString()} (expiring soon)`);
      }
    }

    if (vendor.insuranceExpiryDate) {
      if (vendor.insuranceExpiryDate < now) {
        issues.push(`Insurance certificate expired on ${vendor.insuranceExpiryDate.toLocaleDateString()}`);
        shouldHold = true;
      } else if (vendor.insuranceExpiryDate < thirtyDays) {
        issues.push(`Insurance expires on ${vendor.insuranceExpiryDate.toLocaleDateString()} (expiring soon)`);
      }
    }

    if (vendor.backgroundCheckStatus === "rejected") {
      issues.push("Background check was rejected");
      shouldHold = true;
    } else if (vendor.backgroundCheckStatus === "expired") {
      issues.push("Background check has expired");
    }

    vendor.lastComplianceCheck = now;

    if (shouldHold && !vendor.complianceHold) {
      vendor.complianceHold = true;
      vendor.complianceHoldReason = issues.filter((i) => !i.includes("expiring soon")).join("; ");
    } else if (!shouldHold && vendor.complianceHold) {
      vendor.complianceHold = false;
      vendor.complianceHoldReason = undefined;
    }

    await vendor.save();

    return NextResponse.json({
      vendor,
      complianceResult: {
        isCompliant: issues.length === 0,
        onHold: vendor.complianceHold,
        issues,
        checkedAt: now,
      },
    });
  } catch (error) {
    console.error("POST compliance-check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
