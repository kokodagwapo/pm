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

    const user = session.user as SessionUser;
    const isManager = ["admin", "super_admin", "manager"].includes(user.role);

    const vendor = await Vendor.findById(vendorId)
      .select(
        "name userId walletBalance totalEarnings pendingPayout bankAccountLast4 bankAccountVerified payoutRequests"
      )
      .lean();

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const vendorOwner = (vendor as { userId?: { toString: () => string } }).userId;
    if (!isManager && vendorOwner?.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recentJobs = await VendorJob.find({
      assignedVendorId: new mongoose.Types.ObjectId(vendorId),
      status: { $in: ["approved", "payment_released"] },
    })
      .select("title finalCost status approvedDate paymentReleasedDate")
      .sort({ approvedDate: -1 })
      .limit(20)
      .lean();

    const v = vendor as typeof vendor & {
      walletBalance?: number;
      totalEarnings?: number;
      pendingPayout?: number;
      bankAccountLast4?: string;
      bankAccountVerified?: boolean;
      payoutRequests?: unknown[];
    };

    return NextResponse.json({
      wallet: {
        balance: v.walletBalance || 0,
        totalEarnings: v.totalEarnings || 0,
        pendingPayout: v.pendingPayout || 0,
        bankAccountLast4: v.bankAccountLast4,
        bankAccountVerified: v.bankAccountVerified || false,
      },
      payoutRequests: v.payoutRequests || [],
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
    await connectDB();

    const body = await request.json();
    const { vendorId, action, amount, bankAccountLast4, bankRoutingLast4, payoutRequestId, notes } = body;

    const managerRoles = ["admin", "super_admin", "manager"];
    const isManager = managerRoles.includes(user.role);

    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return NextResponse.json({ error: "Invalid vendorId" }, { status: 400 });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    if (action === "add_bank") {
      if (!isManager && vendor.userId?.toString() !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      vendor.bankAccountLast4 = bankAccountLast4;
      vendor.bankRoutingLast4 = bankRoutingLast4;
      vendor.bankAccountVerified = true;
      await vendor.save();
      return NextResponse.json({ message: "Bank account added" });
    }

    if (action === "fund") {
      if (!isManager) {
        return NextResponse.json({ error: "Only managers can fund vendor wallets" }, { status: 403 });
      }
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid fund amount" }, { status: 400 });
      }
      await Vendor.findByIdAndUpdate(vendorId, [
        {
          $set: {
            walletBalance: { $add: ["$walletBalance", amount] },
          },
        },
      ]);
      return NextResponse.json({
        message: `Wallet funded with $${Number(amount).toFixed(2)}`,
        newBalance: vendor.walletBalance + amount,
      });
    }

    if (action === "request_payout") {
      if (!isManager && vendor.userId?.toString() !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid payout amount" }, { status: 400 });
      }
      if (!vendor.bankAccountVerified) {
        return NextResponse.json(
          { error: "Bank account must be linked before requesting payout" },
          { status: 409 }
        );
      }
      if (vendor.walletBalance < amount) {
        return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 409 });
      }

      const payoutReq = {
        amount,
        requestedAt: new Date(),
        status: "pending" as const,
        notes,
      };

      if (!vendor.payoutRequests) vendor.payoutRequests = [];
      vendor.payoutRequests.push(payoutReq as Parameters<typeof vendor.payoutRequests.push>[0]);
      vendor.pendingPayout = (vendor.pendingPayout || 0) + amount;
      await vendor.save();

      return NextResponse.json({
        message: `Payout request of $${Number(amount).toFixed(2)} submitted`,
        payoutRequest: payoutReq,
      });
    }

    if (action === "approve_payout") {
      if (!isManager) {
        return NextResponse.json({ error: "Only managers can approve payouts" }, { status: 403 });
      }
      if (!payoutRequestId) {
        return NextResponse.json({ error: "payoutRequestId required" }, { status: 400 });
      }

      const payoutReq = (vendor.payoutRequests as Array<{
        _id: { toString: () => string };
        status: string;
        amount: number;
        processedAt?: Date;
        approvedBy?: mongoose.Types.ObjectId;
        referenceId?: string;
      }>)?.find((r) => r._id.toString() === payoutRequestId);

      if (!payoutReq) {
        return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
      }
      if (payoutReq.status !== "pending") {
        return NextResponse.json({ error: "Payout request is not pending" }, { status: 409 });
      }
      if (vendor.walletBalance < payoutReq.amount) {
        return NextResponse.json({ error: "Insufficient wallet balance for this payout" }, { status: 409 });
      }

      payoutReq.status = "processing";
      payoutReq.approvedBy = new mongoose.Types.ObjectId(user.id);
      payoutReq.processedAt = new Date();
      payoutReq.referenceId = `ACH-${Date.now()}`;

      vendor.walletBalance = Math.max(0, vendor.walletBalance - payoutReq.amount);
      vendor.pendingPayout = Math.max(0, (vendor.pendingPayout || 0) - payoutReq.amount);
      await vendor.save();

      setTimeout(async () => {
        try {
          const v2 = await Vendor.findById(vendorId);
          if (!v2) return;
          const req2 = (v2.payoutRequests as Array<{ _id: { toString: () => string }; status: string; totalEarnings?: number }>)?.find(
            (r) => r._id.toString() === payoutRequestId
          );
          if (req2 && req2.status === "processing") {
            req2.status = "paid";
            v2.totalEarnings = (v2.totalEarnings || 0) + payoutReq.amount;
            await v2.save();
          }
        } catch {
          // best-effort
        }
      }, 2000);

      return NextResponse.json({
        message: `Payout of $${payoutReq.amount.toFixed(2)} approved and processing via ACH`,
        referenceId: payoutReq.referenceId,
        newBalance: vendor.walletBalance,
      });
    }

    if (action === "payout") {
      if (!isManager) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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
        return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 409 });
      }
      vendor.walletBalance -= amount;
      vendor.pendingPayout = Math.max(0, vendor.pendingPayout - amount);
      await vendor.save();
      return NextResponse.json({
        message: `Payout of $${Number(amount).toFixed(2)} initiated via ACH`,
        newBalance: vendor.walletBalance,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/vendors/wallet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
