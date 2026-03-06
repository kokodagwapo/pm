/**
 * SmartStartPM - Seed Properties from JSON
 * Imports properties from data/properties.json into MongoDB.
 * Use this on Replit after pulling from GitHub to load property data.
 *
 * Usage: npm run seed:properties:json
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import Property from "../models/Property";
import User from "../models/User";

async function seedFromJson() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
  }

  const dataPath = path.resolve(process.cwd(), "data", "properties.json");
  if (!fs.existsSync(dataPath)) {
    console.error("❌ data/properties.json not found.");
    console.error("   Run 'npm run export:properties' locally first, then push to GitHub.");
    process.exit(1);
  }

  console.log("📥 Seeding properties from data/properties.json...\n");

  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log("✅ Connected to MongoDB\n");

  const ownerUser = await User.findOne({ email: "owner@smartstart.us" });
  const adminUser = await User.findOne({ email: "hi@smartstart.us" });
  const demoOwner = await User.findOne({ email: "admin@propertypro.com" });
  const ownerId = ownerUser?._id || adminUser?._id || demoOwner?._id;
  const managerId = adminUser?._id || demoOwner?._id;

  if (!ownerId) {
    console.error("❌ No owner user found. Run 'npm run seed:demo' first.");
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
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

  console.log("=================================");
  console.log(`✅ Seed complete: ${created} created, ${updated} updated, ${skipped} skipped`);
  await mongoose.disconnect();
  process.exit(0);
}

seedFromJson().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
