/**
 * SmartStartPM - Bidirectional Sync Script
 *
 * Combines export + seed into a single command for bidirectional sync.
 *   --export   Export MongoDB properties → data/properties.json (for pushing to GitHub)
 *   --import   Import data/properties.json → MongoDB (after pulling from GitHub)
 *   --sync     Export then import (full round-trip merge)
 *
 * Usage:
 *   npm run sync:export    # MongoDB → JSON (Replit → GitHub)
 *   npm run sync:import    # JSON → MongoDB (GitHub → Replit)
 *   npm run sync:data      # Full bidirectional merge
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import Property from "../models/Property";
import User from "../models/User";

const DATA_PATH = path.resolve(process.cwd(), "data", "properties.json");
const DATA_DIR = path.resolve(process.cwd(), "data");

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
  }
  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log("✅ Connected to MongoDB\n");
}

async function exportProperties(): Promise<number> {
  console.log("📤 Exporting properties from MongoDB → data/properties.json...\n");

  const properties = await Property.find({}).lean();
  const count = properties.length;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(properties, null, 2), "utf-8");
  console.log(`✅ Exported ${count} properties to data/properties.json\n`);
  return count;
}

async function importProperties(): Promise<{ created: number; updated: number; skipped: number }> {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("❌ data/properties.json not found.");
    console.error("   Run 'npm run sync:export' first, then push to GitHub.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  console.log("📥 Importing properties from data/properties.json → MongoDB...\n");

  const ownerUser = await User.findOne({ email: "owner@smartstart.us" });
  const adminUser = await User.findOne({ email: "hi@smartstart.us" });
  const demoOwner = await User.findOne({ email: "admin@propertypro.com" });
  const ownerId = ownerUser?._id || adminUser?._id || demoOwner?._id;
  const managerId = adminUser?._id || demoOwner?._id;

  if (!ownerId) {
    console.error("❌ No owner user found. Run 'npm run seed:demo' first.");
    return { created: 0, updated: 0, skipped: 0 };
  }

  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  const properties = JSON.parse(raw) as Record<string, unknown>[];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of properties) {
    const name = p.name as string;
    const unitNum = (p.units as Record<string, unknown>[])?.[0]?.unitNumber as string;
    const existing = await Property.findOne({
      $or: [
        { "units.unitNumber": unitNum },
        { name: { $regex: new RegExp(name.slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") } },
      ],
    });

    const { _id, __v, ...doc } = p;
    const cleanDoc = JSON.parse(JSON.stringify(doc));

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (cleanDoc.images?.length > 0 && (!existing.images || existing.images.length === 0)) {
        updates.images = cleanDoc.images;
      }
      if (cleanDoc.description && (!existing.description || existing.description.length < 50)) {
        updates.description = cleanDoc.description;
      }
      if (cleanDoc.address && (!existing.address?.street || existing.address.street === "TBD")) {
        updates.address = cleanDoc.address;
      }
      if (existing.units?.[0] && cleanDoc.units?.[0]?.images?.length > 0 && (!existing.units[0].images || existing.units[0].images!.length === 0)) {
        updates["units.0.images"] = cleanDoc.units[0].images;
      }
      if (Object.keys(updates).length > 0) {
        await Property.updateOne({ _id: existing._id }, { $set: updates });
        updated++;
      } else {
        skipped++;
      }
    } else {
      const property = new Property({
        ...cleanDoc,
        ownerId,
        managerId: managerId || ownerId,
      });
      await property.save();
      created++;
    }
  }

  console.log(`✅ Import complete: ${created} created, ${updated} updated, ${skipped} skipped\n`);
  return { created, updated, skipped };
}

async function main() {
  const arg = process.argv[2] || "--sync";

  await connectDB();

  if (arg === "--export") {
    const count = await exportProperties();
    console.log("=================================");
    console.log(`Done! ${count} properties exported.`);
    console.log("Next: git add data/properties.json && git commit -m 'Sync property data' && git push");
  } else if (arg === "--import") {
    const result = await importProperties();
    console.log("=================================");
    console.log(`Done! ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`);
  } else {
    // Full bidirectional sync: export first (capture current DB), then import (merge JSON into DB)
    console.log("🔄 Running full bidirectional sync...\n");
    const exportCount = await exportProperties();
    const importResult = await importProperties();
    // Re-export after import to capture any newly created properties
    const finalCount = await exportProperties();
    console.log("=================================");
    console.log("🔄 Bidirectional sync complete!");
    console.log(`   Exported: ${finalCount} properties`);
    console.log(`   Imported: ${importResult.created} created, ${importResult.updated} updated, ${importResult.skipped} skipped`);
    console.log("\nNext: git add data/properties.json && git commit -m 'Sync property data' && git push");
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Sync failed:", err);
  process.exit(1);
});
