export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import ManagerWallet from "@/models/ManagerWallet";
import mongoose from "mongoose";

interface SessionUser {
  id: string;
  role: string;
}

const MANAGER_ROLES = ["admin", "super_admin", "manager"];

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as SessionUser | undefined;
    if (!user?.id || !MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const wallet = await ManagerWallet.findOne({ managerId: new mongoose.Types.ObjectId(user.id) }).lean();

    if (!wallet) {
      return NextResponse.json({
        balance: 0,
        transactions: [],
        message: "No wallet yet — add funds to create your wallet",
      });
    }

    return NextResponse.json({
      balance: (wallet as { balance: number }).balance,
      transactions: (wallet as { transactions: unknown[] }).transactions,
    });
  } catch (error) {
    console.error("GET /api/manager/wallet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as SessionUser | undefined;
    if (!user?.id || !MANAGER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, amount, description } = body;

    if (action === "add_funds") {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }

      const wallet = await ManagerWallet.findOneAndUpdate(
        { managerId: new mongoose.Types.ObjectId(user.id) },
        {
          $inc: { balance: amount },
          $push: {
            transactions: {
              type: "credit",
              amount,
              description: description || "Funds added",
              createdAt: new Date(),
            },
          },
          $setOnInsert: { managerId: new mongoose.Types.ObjectId(user.id) },
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({
        message: `$${Number(amount).toFixed(2)} added to manager wallet`,
        balance: wallet.balance,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/manager/wallet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
