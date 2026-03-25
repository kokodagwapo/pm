import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Vendor from "@/models/Vendor";
import VendorJob from "@/models/VendorJob";
import mongoose from "mongoose";

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
    const vendorId = searchParams.get("vendorId");

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return NextResponse.json({ error: "Invalid vendorId" }, { status: 400 });
    }

    const vendor = await Vendor.findById(vendorId)
      .select("name walletBalance totalEarnings pendingPayout bankAccountLast4 bankAccountVerified")
      .lean();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const recentJobs = await VendorJob.find({
      assignedVendorId: new mongoose.Types.ObjectId(vendorId),
      status: { $in: ["approved", "payment_released"] },
    })
      .select("title finalCost status approvedDate paymentReleasedDate")
      .sort({ approvedDate: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      wallet: {
        balance: (vendor as { walletBalance?: number }).walletBalance || 0,
        totalEarnings: (vendor as { totalEarnings?: number }).totalEarnings || 0,
        pendingPayout: (vendor as { pendingPayout?: number }).pendingPayout || 0,
        bankAccountLast4: (vendor as { bankAccountLast4?: string }).bankAccountLast4,
        bankAccountVerified: (vendor as { bankAccountVerified?: boolean }).bankAccountVerified || false,
      },
      transactions: recentJobs,
    });
  } catch (error) {
    console.error("GET /api/vendors/wallet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    if (!["admin", "super_admin", "manager"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { vendorId, action, amount, bankAccountLast4, bankRoutingLast4 } =
      await request.json();

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return NextResponse.json({ error: "Invalid vendorId" }, { status: 400 });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    if (action === "add_bank") {
      vendor.bankAccountLast4 = bankAccountLast4;
      vendor.bankRoutingLast4 = bankRoutingLast4;
      vendor.bankAccountVerified = true;
      await vendor.save();
      return NextResponse.json({ message: "Bank account added", vendor });
    }

    if (action === "payout") {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid payout amount" }, { status: 400 });
      }
      if (!vendor.bankAccountVerified) {
        return NextResponse.json(
          { error: "Bank account must be verified before payout" },
          { status: 409 }
        );
      }
      if (vendor.walletBalance < amount) {
        return NextResponse.json(
          { error: "Insufficient wallet balance" },
          { status: 409 }
        );
      }
      vendor.walletBalance -= amount;
      vendor.pendingPayout = Math.max(0, vendor.pendingPayout - amount);
      await vendor.save();
      return NextResponse.json({
        message: `Payout of $${amount.toFixed(2)} initiated via ACH`,
        newBalance: vendor.walletBalance,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/vendors/wallet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
