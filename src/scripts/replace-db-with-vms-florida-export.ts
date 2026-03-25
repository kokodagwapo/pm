/**
 * Replace dev DB properties with the scraped VMS Florida advanced-search export,
 * and remove every other property (with common dependent documents).
 *
 * Data: data/vms-florida-advanced-search-export.json (generated from vms-florida.com)
 *
 * Usage: npm run db:vms-only
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import Property from "../models/Property";
import User from "../models/User";
import Lease from "../models/Lease";
import Payment from "../models/Payment";
import Invoice from "../models/Invoice";
import Application from "../models/Application";
import MaintenanceRequest from "../models/MaintenanceRequest";
import DateBlock from "../models/DateBlock";
import PropertyPricing from "../models/PropertyPricing";
import PricingRule from "../models/PricingRule";
import RentalRequest from "../models/RentalRequest";
import Review from "../models/Review";
import PaymentReceipt from "../models/PaymentReceipt";
import EvictionCase from "../models/EvictionCase";
import RecurringPayment from "../models/RecurringPayment";
import RenewalOpportunity from "../models/RenewalOpportunity";
import { PropertyType, PropertyStatus } from "../types";

const VMS_SOURCE = "vms-florida.com";
const EXPORT_PATH = path.resolve(
  process.cwd(),
  "data/vms-florida-advanced-search-export.json"
);

interface VmsExportRow {
  url: string;
  title: string;
  price_per_night: string | null;
  cleaning_fee?: string;
  min_nights?: string;
  security_deposit?: string;
  guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_id: string;
  address: string;
  city: string;
  area?: string;
  county?: string;
  state: string;
  zip: string;
  country: string;
  description: string;
  photo_count?: number | null;
  verified_listing?: boolean;
}

interface ExportFile {
  properties: VmsExportRow[];
}

function readExport(): ExportFile {
  const raw = fs.readFileSync(EXPORT_PATH, "utf-8");
  return JSON.parse(raw) as ExportFile;
}

function parseMoneyUsd(s: string | undefined | null): number {
  if (!s) return 0;
  const m = s.replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function inferPropertyType(title: string): PropertyType {
  const t = title.toUpperCase();
  if (t.includes("VILLA")) return PropertyType.TOWNHOUSE;
  if (t.includes("CONDO")) return PropertyType.CONDO;
  if (t.includes("HOUSE") || t.includes(" HOME") || t.includes("HOME,"))
    return PropertyType.HOUSE;
  return PropertyType.CONDO;
}

function normalizeState(s: string): string {
  const x = (s || "").trim();
  if (/florida/i.test(x)) return "FL";
  return x.length > 2 ? x.slice(0, 2).toUpperCase() : x.toUpperCase();
}

async function cascadeDeleteForProperties(propertyIds: mongoose.Types.ObjectId[]) {
  if (propertyIds.length === 0) return;

  const q = { propertyId: { $in: propertyIds } };

  const ops: Promise<unknown>[] = [
    Payment.deleteMany(q),
    Invoice.deleteMany(q),
    Application.deleteMany(q),
    MaintenanceRequest.deleteMany(q),
    DateBlock.deleteMany(q),
    PropertyPricing.deleteMany(q),
    PricingRule.deleteMany(q),
    RentalRequest.deleteMany(q),
    Review.deleteMany(q),
    PaymentReceipt.deleteMany(q),
    EvictionCase.deleteMany(q),
    RecurringPayment.deleteMany(q),
    RenewalOpportunity.deleteMany(q),
    Lease.deleteMany(q),
  ];

  const results = await Promise.allSettled(ops);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    for (const f of failed) {
      if (f.status === "rejected") {
        console.warn("   ⚠️  cascade step:", f.reason?.message || f.reason);
      }
    }
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing (.env.local)");

  if (!fs.existsSync(EXPORT_PATH)) {
    throw new Error(`Export file not found: ${EXPORT_PATH}`);
  }

  const { properties: rows } = readExport();
  if (!rows?.length) throw new Error("Export has no properties");

  console.log("🔗 Connecting…");
  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
  });

  const ownerUser = await User.findOne({ email: "owner@smartstart.us" });
  const adminUser = await User.findOne({ email: "hi@smartstart.us" });
  if (!ownerUser && !adminUser) {
    throw new Error("No owner@smartstart.us or hi@smartstart.us — run npm run seed:demo first.");
  }
  const ownerId = ownerUser?._id || adminUser!._id;
  const managerId = adminUser?._id;

  const desiredExternalIds = rows
    .map((r) => (r.property_id || "").trim())
    .filter(Boolean);

  const toRemove = await Property.collection
    .find(
      {
        deletedAt: null,
        $or: [
          { importSource: { $exists: false } },
          { importSource: { $ne: VMS_SOURCE } },
          {
            $and: [
              { importSource: VMS_SOURCE },
              { importExternalId: { $nin: desiredExternalIds } },
            ],
          },
        ],
      },
      { projection: { _id: 1 } }
    )
    .toArray();

  const removeIds = toRemove.map((d) => d._id as mongoose.Types.ObjectId);
  console.log(`🗑️  Removing ${removeIds.length} properties (not in current VMS export) + dependents…`);
  await cascadeDeleteForProperties(removeIds);
  if (removeIds.length) {
    await Property.deleteMany({ _id: { $in: removeIds } });
  }

  const staleVms = await Property.collection
    .find(
      {
        deletedAt: null,
        importSource: VMS_SOURCE,
        importExternalId: { $in: desiredExternalIds },
      },
      { projection: { _id: 1 } }
    )
    .toArray();
  const staleIds = staleVms.map((d) => d._id as mongoose.Types.ObjectId);
  if (staleIds.length) {
    console.log(`🔁 Refreshing ${staleIds.length} existing VMS properties (re-import)…`);
    await cascadeDeleteForProperties(staleIds);
    await Property.deleteMany({ _id: { $in: staleIds } });
  }

  console.log(`🏠 Inserting ${rows.length} listings from export…`);

  const placeholderImg =
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80";

  let inserted = 0;
  for (const row of rows) {
    const extId = (row.property_id || "").trim();
    if (!extId) continue;

    const nightly = parseMoneyUsd(row.price_per_night);
    const deposit = parseMoneyUsd(row.security_deposit) || 500;
    const br = row.bedrooms ?? 2;
    const ba = row.bathrooms ?? 2;
    const guests = row.guests ?? 4;
    const monthlyRent = nightly > 0 ? Math.round(nightly * 30) : 240 * 30;

    const title = (row.title || `VMS ${extId}`).slice(0, 200);
    const ptype = inferPropertyType(title);
    const unitType =
      ptype === PropertyType.HOUSE ? "loft" : ptype === PropertyType.TOWNHOUSE ? "penthouse" : "apartment";

    const descParts = [
      (row.description || "").slice(0, 1800),
      row.url ? `\n\nSource: ${row.url}` : "",
      row.min_nights ? `\nMin nights: ${row.min_nights}` : "",
      row.cleaning_fee ? `\nCleaning: ${row.cleaning_fee}` : "",
    ];
    const description = descParts.join("").slice(0, 2000);

    const street = (row.address || row.area || "Address on file").slice(0, 200);
    const city = (row.city || "Naples").slice(0, 100);
    const zipCode = (row.zip || "34119").slice(0, 20);
    const country = (row.country || "United States").includes("United States")
      ? "USA"
      : row.country.slice(0, 100);

    const prop = new Property({
      name: title,
      type: ptype,
      status: PropertyStatus.AVAILABLE,
      description,
      address: {
        street,
        city,
        state: normalizeState(row.state || "FL"),
        zipCode,
        country,
      },
      neighborhood: row.area?.slice(0, 120) || undefined,
      ownerId,
      managerId,
      isMultiUnit: false,
      totalUnits: 1,
      images: [placeholderImg],
      amenities: [
        { name: "Air conditioning", category: "Climate" },
        { name: "WiFi", category: "Utilities" },
        { name: "Kitchen", category: "Kitchen" },
      ],
      importSource: VMS_SOURCE,
      importExternalId: extId,
      importListingUrl: row.url?.replace(/\/$/, ""),
      units: [
        {
          unitNumber: `VMS-${extId}`,
          unitType,
          floor: 1,
          bedrooms: br,
          bathrooms: ba,
          squareFootage: Math.min(50000, Math.max(600, 900 + br * 120)),
          rentAmount: monthlyRent,
          securityDeposit: deposit,
          status: PropertyStatus.AVAILABLE,
          images: [placeholderImg],
          centralAir: true,
          notes: `Guests (VMS): ${guests}. Nightly: USD ${nightly || "—"}.`,
        },
      ],
    });

    await prop.save();
    inserted++;
  }

  console.log(`✅ Done. Properties in DB from ${VMS_SOURCE}: ${inserted}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
