/**
 * Seed one detailed ACTIVE lease for dashboard demos (e.g. /dashboard/leases/active).
 * Prefers "Vanderbilt Beach House" + first available unit + tenant@smartstart.us.
 *
 * Idempotent: skips if a lease with [SAMPLE_LEASE_SEED] in notes already exists.
 *
 * Usage: npm run seed:sample-lease
 * Requires: MONGODB_URI in .env.local
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import Property from "../models/Property";
import User from "../models/User";
import Lease from "../models/Lease";
import { LeaseStatus, PaymentMethod } from "../types";

const SEED_MARKER = "[SAMPLE_LEASE_SEED]";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const dup = await Lease.findOne({ notes: { $regex: "\\[SAMPLE_LEASE_SEED\\]" } });
  if (dup) {
    console.log("Sample lease already exists:", dup._id.toString());
    console.log("Open /dashboard/leases/active to view active leases.");
    await mongoose.disconnect();
    process.exit(0);
  }

  const tenant = await User.findOne({
    email: "tenant@smartstart.us",
    role: "tenant",
  });
  if (!tenant) {
    console.error("No tenant@smartstart.us found. Run npm run seed:demo first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!tenant.tenantStatus || !["approved", "active"].includes(tenant.tenantStatus)) {
    await User.updateOne(
      { _id: tenant._id },
      { $set: { tenantStatus: "active", backgroundCheckStatus: "approved" } }
    );
    console.log("Updated tenant@smartstart.us to active/approved for leasing.");
  }

  let property =
    (await Property.findOne({ name: /Vanderbilt Beach House/i })) ||
    (await Property.findOne({ "units.status": "available" }));

  if (!property) {
    console.error("No property with an available unit found. Seed properties first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const availableUnit = property.units?.find((u: { status?: string }) => u.status === "available");
  if (!availableUnit?._id) {
    console.error(`No available unit on property "${property.name}". Free a unit or pick another property.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const unitId = availableUnit._id;

  const overlap = await Lease.findOne({
    propertyId: property._id,
    unitId,
    status: { $in: [LeaseStatus.ACTIVE, LeaseStatus.PENDING] },
    deletedAt: null,
    $or: [
      {
        startDate: { $lte: new Date("2030-12-31") },
        endDate: { $gte: new Date("2020-01-01") },
      },
    ],
  });

  if (overlap) {
    console.error(
      `Unit ${availableUnit.unitNumber} on "${property.name}" already has an active/pending lease (${overlap._id}).`
    );
    console.error("End that lease or use a different unit, then re-run this script.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const start = new Date();
  start.setMonth(start.getMonth() - 2);
  start.setDate(1);

  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);

  const lease = new Lease({
    propertyId: property._id,
    unitId,
    tenantId: tenant._id,
    startDate: start,
    endDate: end,
    status: LeaseStatus.ACTIVE,
    paymentStatus: "current",
    terms: {
      rentAmount: 8750,
      securityDeposit: 8750,
      lateFee: 150,
      petDeposit: 500,
      utilities: ["water", "sewer", "trash", "internet", "cable"],
      restrictions: [
        "No smoking indoors",
        "Quiet hours 10:00 p.m. – 8:00 a.m.",
        "Maximum 2 vehicles in driveway",
        "Pool heat optional; tenant pays utility surcharge if enabled",
        "HOA guest policy: register visitors over 7 days",
      ],
      paymentConfig: {
        rentDueDay: 1,
        lateFeeConfig: {
          enabled: true,
          gracePeriodDays: 5,
          feeType: "fixed",
          feeAmount: 150,
          compoundDaily: false,
          notificationDays: [3, 7, 14],
        },
        acceptedPaymentMethods: [
          PaymentMethod.BANK_TRANSFER,
          PaymentMethod.ACH,
          PaymentMethod.CREDIT_CARD,
        ],
        autoCreatePayments: true,
        prorationEnabled: true,
        advancePaymentMonths: 0,
        autoGenerateInvoices: true,
        autoEmailInvoices: false,
        prorationMethod: "daily",
        roundingMethod: "round",
        minimumProrationCharge: 0,
      },
    },
    documents: [
      "https://example.com/sample-docs/vanderbilt-lease-agreement.pdf",
      "https://example.com/sample-docs/move-in-checklist.pdf",
      "https://example.com/sample-docs/pet-addendum.pdf",
    ],
    renewalOptions: {
      available: true,
      terms:
        "Renewal offered at same terms with 3% annual adjustment if notice given 60 days prior to lease end. Month-to-month available at +15% over renewal rate.",
    },
    notes: `${SEED_MARKER} Demo lease for UI/testing. Gulf-front seasonal residence; tenant responsible for electricity, cable beyond basic package, and lawn/pool care per addendum. Property manager: quarterly inspections with 48h notice.`,
  });

  await lease.save();

  console.log("Created sample ACTIVE lease:", lease._id.toString());
  console.log(`  Property: ${property.name}`);
  console.log(`  Unit: ${availableUnit.unitNumber}`);
  console.log(`  Tenant: tenant@smartstart.us`);
  console.log(`  Term: ${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`);
  console.log("Visit http://localhost:3001/dashboard/leases/active (or your dev port) as admin/manager.");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
