/**
 * SmartStartPM - Export Properties to JSON
 * Exports all properties from MongoDB to data/properties.json for version control.
 * Use this to push property data to GitHub so Replit can seed from it.
 *
 * Usage: npm run export:properties
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import Property from "../models/Property";

async function exportProperties() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
  }

  console.log("📤 Exporting properties to JSON...\n");

  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log("✅ Connected to MongoDB\n");

  const properties = await Property.find({}).lean();
  const count = properties.length;

  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, "properties.json");
  const json = JSON.stringify(properties, null, 2);
  fs.writeFileSync(outputPath, json, "utf-8");

  console.log(`✅ Exported ${count} properties to data/properties.json`);
  console.log(`   File: ${outputPath}\n`);
  console.log("   Next: git add data/properties.json && git commit -m 'Add property data for Replit' && git push");

  await mongoose.disconnect();
  process.exit(0);
}

exportProperties().catch((err) => {
  console.error("❌ Export failed:", err);
  process.exit(1);
});
