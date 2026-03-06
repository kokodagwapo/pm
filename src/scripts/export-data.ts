/**
 * SmartStartPM — Database Export Script
 * Exports all MongoDB collections to a JSON snapshot file.
 * The output can be committed to the repo or used with import-data.ts
 * to restore a fresh Replit environment instantly.
 *
 * Usage:  npm run export:data
 * Output: data/snapshot.json
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import fs from 'fs';

// Models (import to register schemas)
import Property from '../models/Property';
import User from '../models/User';
import Tenant from '../models/Tenant';
import Lease from '../models/Lease';
import MaintenanceRequest from '../models/MaintenanceRequest';
import FAQ from '../models/FAQ';
import Invoice from '../models/Invoice';
import Announcement from '../models/Announcement';
import DisplaySettings from '../models/DisplaySettings';

const OUTPUT_DIR  = path.resolve(process.cwd(), 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'snapshot.json');

function getMongoUri(): string {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SmartStartPM';
  if (uri.includes('=') && !uri.startsWith('mongodb')) {
    uri = uri.substring(uri.indexOf('=') + 1).trim();
  }
  return uri;
}

async function exportData() {
  const MONGODB_URI = getMongoUri();
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not set in .env.local');

  console.log('📦  SmartStartPM — Database Export');
  console.log('====================================\n');

  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 12000,
  });
  console.log('✅  Connected to MongoDB\n');

  const snapshot: Record<string, unknown[]> = {};

  const collections: Array<{ name: string; model: mongoose.Model<any> }> = [
    { name: 'users',               model: User              },
    { name: 'properties',          model: Property          },
    { name: 'tenants',             model: Tenant            },
    { name: 'leases',              model: Lease             },
    { name: 'maintenanceRequests', model: MaintenanceRequest },
    { name: 'faqs',                model: FAQ               },
    { name: 'invoices',            model: Invoice           },
    { name: 'announcements',       model: Announcement      },
    { name: 'displaySettings',     model: DisplaySettings   },
  ];

  for (const { name, model } of collections) {
    try {
      const docs = await model.find({}).lean();
      snapshot[name] = docs;
      console.log(`   📄  ${name.padEnd(22)} ${docs.length} documents`);
    } catch (err: any) {
      console.warn(`   ⚠️   ${name}: skipped (${err.message})`);
      snapshot[name] = [];
    }
  }

  // Write output
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const meta = {
    exportedAt: new Date().toISOString(),
    mongoUri: MONGODB_URI.replace(/\/\/.*@/, '//***:***@'),
    collections: Object.fromEntries(
      Object.entries(snapshot).map(([k, v]) => [k, (v as unknown[]).length])
    ),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ meta, data: snapshot }, null, 2));

  const sizeKB = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(`\n✅  Exported to: ${OUTPUT_FILE}`);
  console.log(`    Size: ${sizeKB} KB`);
  console.log(`    Collections: ${collections.length}`);
  console.log(`    Total documents: ${Object.values(snapshot).reduce((s, v) => s + (v as unknown[]).length, 0)}`);

  await mongoose.disconnect();
  process.exit(0);
}

exportData().catch(err => {
  console.error('❌  Export failed:', err.message);
  process.exit(1);
});
