/**
 * SmartStartPM — Database Import / Restore Script
 * Reads data/snapshot.json and upserts every document back into MongoDB.
 * Safe to run multiple times — uses upsert so it won't create duplicates.
 *
 * Usage:  npm run import:data
 * Input:  data/snapshot.json  (produced by export-data.ts)
 *
 * Typical restore workflow on a fresh Replit:
 *   1. npm run seed:demo          (create auth users first)
 *   2. npm run import:data        (restore everything else)
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import fs from 'fs';

// Register schemas
import Property from '../models/Property';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Lease from '../models/Lease';
import MaintenanceRequest from '../models/MaintenanceRequest';
import FAQ from '../models/FAQ';
import Invoice from '../models/Invoice';
import Announcement from '../models/Announcement';
import DisplaySettings from '../models/DisplaySettings';

const SNAPSHOT_FILE = path.resolve(process.cwd(), 'data', 'snapshot.json');

const MODEL_MAP: Record<string, mongoose.Model<any>> = {
  users:               User,
  properties:          Property,
  tenants:             Tenant,
  leases:              Lease,
  maintenanceRequests: MaintenanceRequest,
  faqs:                FAQ,
  invoices:            Invoice,
  announcements:       Announcement,
  displaySettings:     DisplaySettings,
};

function getMongoUri(): string {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SmartStartPM';
  if (uri.includes('=') && !uri.startsWith('mongodb')) {
    uri = uri.substring(uri.indexOf('=') + 1).trim();
  }
  return uri;
}

async function importData() {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    console.error(`❌  Snapshot not found: ${SNAPSHOT_FILE}`);
    console.error('    Run  npm run export:data  on a working environment first.');
    process.exit(1);
  }

  const MONGODB_URI = getMongoUri();
  if (!MONGODB_URI) throw new Error('MONGODB_URI could not be resolved');

  console.log('📥  SmartStartPM — Database Import / Restore');
  console.log('=============================================\n');

  const raw = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
  const { meta, data } = raw as { meta: Record<string, unknown>; data: Record<string, any[]> };

  console.log(`    Snapshot from : ${meta.exportedAt}`);
  const collectionCounts = meta.collections as Record<string, number>;
  for (const [k, v] of Object.entries(collectionCounts)) {
    console.log(`    ${k.padEnd(22)} ${v} documents`);
  }
  console.log();

  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 12000,
  });
  console.log('✅  Connected to MongoDB\n');

  let totalUpserted = 0;

  for (const [collectionName, docs] of Object.entries(data)) {
    const Model = MODEL_MAP[collectionName];
    if (!Model) {
      console.warn(`   ⚠️   No model for collection "${collectionName}" — skipped`);
      continue;
    }

    if (!docs || docs.length === 0) {
      console.log(`   ⏭️   ${collectionName.padEnd(22)} (empty — skipped)`);
      continue;
    }

    let upserted = 0;
    let failed = 0;

    for (const doc of docs) {
      try {
        const filter = { _id: doc._id };
        await Model.findOneAndUpdate(filter, { $set: doc }, { upsert: true, new: true });
        upserted++;
      } catch (err: any) {
        failed++;
        if (process.env.VERBOSE) console.warn(`      ⚠️  ${err.message}`);
      }
    }

    totalUpserted += upserted;
    console.log(`   ✅  ${collectionName.padEnd(22)} ${upserted} upserted${failed > 0 ? `  (${failed} failed)` : ''}`);
  }

  console.log('\n=============================================');
  console.log(`✅  Import complete — ${totalUpserted} total documents restored`);
  console.log('\n💡  Tip: Run  npm run seed:demo  first if users are missing.');

  await mongoose.disconnect();
  process.exit(0);
}

importData().catch(err => {
  console.error('❌  Import failed:', err.message);
  process.exit(1);
});
