/**
 * SmartStartPM - Ensure Demo Users
 * Seeds demo accounts for local/demo environments only.
 */

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const DEMO_AUTH_ENABLED =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_DEMO_AUTH === "true";

const DEMO_ACCOUNTS = [
  { email: "admin@propertypro.com", password: "Admin123$", firstName: "Admin", lastName: "User", role: "admin", phone: "+1234567890", isActive: true, emailVerified: new Date() },
  { email: "hi@smartstart.us", password: "SmartStart2025", firstName: "Super", lastName: "Admin", role: "admin", phone: "+1234567890", isActive: true, emailVerified: new Date() },
  { email: "manager@smartstart.us", password: "SmartStart2025", firstName: "Property", lastName: "Manager", role: "manager", phone: "+1234567891", isActive: true, emailVerified: new Date() },
  { email: "owner@smartstart.us", password: "SmartStart2025", firstName: "Property", lastName: "Owner", role: "owner", phone: "+1234567894", isActive: true, emailVerified: new Date() },
  { email: "tenant@smartstart.us", password: "SmartStart2025", firstName: "Demo", lastName: "Tenant", role: "tenant", phone: "+1234567892", isActive: true, emailVerified: new Date(), dateOfBirth: new Date("1990-01-01"), tenantStatus: "active", backgroundCheckStatus: "approved", creditScore: 720, employmentInfo: { employer: "Tech Corp", position: "Software Engineer", income: 75000, startDate: new Date("2020-01-01") }, emergencyContacts: [{ name: "Emergency Contact", relationship: "Family", phone: "+1234567893", email: "emergency@example.com" }] },
];

export async function GET() {
  if (!DEMO_AUTH_ENABLED) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    await connectDB();
    const demoEmailsLower = DEMO_ACCOUNTS.map((a) => a.email.toLowerCase());
    const existingDocs = await User.find({
      email: { $in: demoEmailsLower },
    })
      .select("email")
      .lean();
    const existingSet = new Set(
      existingDocs.map((u) => String(u.email).toLowerCase())
    );

    const totalUsers = await User.countDocuments();

    // Empty database: seed all demo accounts (quick login + legacy admin)
    if (totalUsers === 0) {
      await User.deleteMany({ email: { $in: demoEmailsLower } });
      for (const data of DEMO_ACCOUNTS) {
        const user = new User(data);
        await user.save();
      }
      return NextResponse.json({
        ok: true,
        seeded: true,
        count: DEMO_ACCOUNTS.length,
        mode: "full",
      });
    }

    // DB already has users: only add demo accounts that are missing (e.g. after partial seed)
    let added = 0;
    for (const data of DEMO_ACCOUNTS) {
      const email = data.email.toLowerCase();
      if (!existingSet.has(email)) {
        const user = new User(data);
        await user.save();
        existingSet.add(email);
        added += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      seeded: added > 0,
      added,
      totalUsers,
      mode: added > 0 ? "partial" : "noop",
    });
  } catch (err) {
    console.error("ensure-demo error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
