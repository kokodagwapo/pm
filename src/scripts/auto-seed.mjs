import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VMS_SOURCE = 'vms-florida.com';

const AMENITY_CATEGORIES = {
  'Pool': 'Recreation', 'Private Pool': 'Recreation', 'Heated Pool': 'Recreation',
  'Tennis Courts': 'Recreation', 'Fitness Center': 'Recreation', 'Golf Access': 'Recreation',
  'Clubhouse': 'Recreation', 'Spa/Hot Tub': 'Recreation',
  'Air Conditioning': 'Climate', 'Central Air': 'Climate',
  'WiFi': 'Utilities', 'Cable TV': 'Utilities',
  'Kitchen': 'Kitchen', 'Full Kitchen': 'Kitchen', 'Updated Kitchen': 'Kitchen',
  'Washer/Dryer': 'Laundry', 'In-Unit Laundry': 'Laundry',
  'Parking': 'Parking', 'Garage': 'Parking', 'Carport': 'Parking',
  'Lanai': 'Outdoor', 'Screened Lanai': 'Outdoor', 'Patio': 'Outdoor', 'BBQ Grill': 'Outdoor',
  'Lake View': 'Living', 'Golf View': 'Living', 'Preserve View': 'Living',
  'Gated Community': 'Security', 'Pet Friendly': 'Other', 'Elevator Access': 'Other',
};

const NEIGHBORHOOD_ADDRESSES = {
  'Falling Waters':    { street: '7050 Falling Waters Blvd',  city: 'Naples', state: 'FL', zipCode: '34119' },
  'Naples Park':       { street: '819 109th Ave N',            city: 'Naples', state: 'FL', zipCode: '34108' },
  'Winter Park':       { street: '4340 Arctic Circle',         city: 'Naples', state: 'FL', zipCode: '34112' },
  'Glen Eagle':        { street: '7921 Harwich Ct',            city: 'Naples', state: 'FL', zipCode: '34104' },
  'World Tennis Club': { street: '4760 Olympic Dr',            city: 'Naples', state: 'FL', zipCode: '34109' },
  'Royal Arms':        { street: '1280 Georgetown Blvd',       city: 'Naples', state: 'FL', zipCode: '34104' },
  'Moon Lake':         { street: '5640 Moon Lake Cir',         city: 'Naples', state: 'FL', zipCode: '34119' },
  'Villas of Whittenberg': { street: '4823 Whitten Dr',        city: 'Naples', state: 'FL', zipCode: '34104' },
  'Naples':            { street: '3000 Tamiami Trail N',       city: 'Naples', state: 'FL', zipCode: '34103' },
};

const NEIGHBORHOOD_AMENITIES = {
  'Falling Waters':    ['Pool', 'Lake View', 'Gated Community', 'Tennis Courts', 'Air Conditioning', 'WiFi', 'Washer/Dryer', 'Parking', 'Lanai'],
  'Naples Park':       ['Pool', 'BBQ Grill', 'Air Conditioning', 'WiFi', 'Full Kitchen', 'Washer/Dryer', 'Parking', 'Patio'],
  'Winter Park':       ['Pool', 'Air Conditioning', 'WiFi', 'Full Kitchen', 'Washer/Dryer', 'Parking', 'Lanai', 'Gated Community'],
  'Glen Eagle':        ['Pool', 'Golf Access', 'Fitness Center', 'Gated Community', 'Air Conditioning', 'WiFi', 'Washer/Dryer', 'Parking', 'Lanai', 'Lake View'],
  'World Tennis Club': ['Tennis Courts', 'Pool', 'Fitness Center', 'Gated Community', 'Air Conditioning', 'WiFi', 'Washer/Dryer', 'Parking', 'Lanai'],
  'Royal Arms':        ['Pool', 'Gated Community', 'Air Conditioning', 'WiFi', 'Kitchen', 'Washer/Dryer', 'Parking', 'Lanai'],
  'Moon Lake':         ['Pool', 'Lake View', 'Air Conditioning', 'WiFi', 'Full Kitchen', 'Washer/Dryer', 'Parking', 'Patio'],
  'Villas of Whittenberg': ['Pool', 'Air Conditioning', 'WiFi', 'Full Kitchen', 'Washer/Dryer', 'Parking', 'Patio', 'BBQ Grill'],
  'Naples':            ['Pool', 'Air Conditioning', 'WiFi', 'Kitchen', 'Parking'],
};

import bcrypt from 'bcryptjs';

const DEMO_AUTH_ENABLED = process.env.ENABLE_DEMO_AUTH === 'true';

const DEMO_USERS = [
  { email: 'hi@smartstart.us', role: 'admin', firstName: 'Admin', lastName: 'User', password: 'SmartStart2025' },
  { email: 'manager@smartstart.us', role: 'manager', firstName: 'Maria', lastName: 'Manager', password: 'SmartStart2025' },
  { email: 'owner@smartstart.us', role: 'owner', firstName: 'Oliver', lastName: 'Owner', password: 'SmartStart2025' },
  { email: 'tenant@smartstart.us', role: 'tenant', firstName: 'Tina', lastName: 'Tenant', password: 'SmartStart2025' },
  { email: 'superadmin@smartstartpm.com', role: 'admin', firstName: 'Super', lastName: 'Admin', password: 'Sspm!Super2026' },
  { email: 'pmadmin@smartstartpm.com', role: 'manager', firstName: 'PM', lastName: 'Admin', password: 'Sspm!Manager2026' },
  { email: 'owner@smartstartpm.com', role: 'owner', firstName: 'Property', lastName: 'Owner', password: 'Sspm!Owner2026' },
  { email: 'tenant@smartstartpm.com', role: 'tenant', firstName: 'Smart', lastName: 'Tenant', password: 'Sspm!Tenant2026' },
];

async function seedUsers(db) {
  const existing = await db.collection('users').countDocuments({ email: { $in: DEMO_USERS.map(u => u.email) } });
  if (existing > 0) {
    console.log(`  Users already exist (${existing}), skipping user seed`);
    return;
  }
  const now = new Date();
  const users = await Promise.all(DEMO_USERS.map(async (u) => {
    const hash = await bcrypt.hash(u.password, 12);
    return {
      email: u.email,
      role: u.role,
      firstName: u.firstName,
      lastName: u.lastName,
      password: hash,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }));
  await db.collection('users').insertMany(users);
  console.log(`  Seeded ${users.length} demo users`);
}

async function seedRequiredDemoUsers(db) {
  if (!DEMO_AUTH_ENABLED) {
    return;
  }
  await seedUsers(db);
}

function normalizeUrl(url = '') {
  return String(url).trim().replace(/\/$/, '');
}

function parseUsdAmount(value) {
  if (!value) return 0;
  const match = String(value).replace(/,/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function readBundledVmsProperties() {
  const summaryPath = resolve(__dirname, '../../data/vms-properties.json');
  const exportPath = resolve(__dirname, '../../data/vms-florida-advanced-search-export.json');

  const summaryRows = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const exportRows = JSON.parse(readFileSync(exportPath, 'utf8'))?.properties || [];

  const summaryByUrl = new Map(
    summaryRows.map((row) => [normalizeUrl(row.url), row])
  );

  return exportRows.map((row) => {
    const summary = summaryByUrl.get(normalizeUrl(row.url)) || null;
    return { exportRow: row, summary };
  });
}

function collectOfficialImages(summary) {
  const candidates = [
    ...(Array.isArray(summary?.images) ? summary.images : []),
    summary?.ogImage,
  ].filter(Boolean);

  const seen = new Set();
  const images = [];

  for (const raw of candidates) {
    const url = String(raw);
    if (!url.includes('/wp-content/uploads/')) continue;
    if (url.includes('site-icon') || url.includes('favicon')) continue;
    if (/defaultimage_prop\.(jpg|jpeg|png|webp)$/i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    images.push(url);
  }

  return images.slice(0, 20);
}

async function seedProperties(db) {
  const rows = readBundledVmsProperties();
  const now = new Date();
  const users = await db
    .collection('users')
    .find({
      email: {
        $in: [
          'owner@smartstart.us',
          'hi@smartstart.us',
          'owner@smartstartpm.com',
          'superadmin@smartstartpm.com',
          'pmadmin@smartstartpm.com',
        ],
      },
    })
    .project({ _id: 1, email: 1 })
    .toArray();

  const getUserId = (email) => users.find((user) => user.email === email)?._id;
  const ownerId =
    getUserId('owner@smartstart.us') ||
    getUserId('owner@smartstartpm.com') ||
    getUserId('hi@smartstart.us') ||
    getUserId('superadmin@smartstartpm.com') ||
    null;
  const managerId =
    getUserId('hi@smartstart.us') ||
    getUserId('pmadmin@smartstartpm.com') ||
    getUserId('superadmin@smartstartpm.com') ||
    null;

  const operations = [];
  let prepared = 0;

  for (const { exportRow, summary } of rows) {
    const extId = String(exportRow.property_id || '').trim();
    const importListingUrl = normalizeUrl(summary?.url || exportRow.url || '');
    const images = collectOfficialImages(summary);
    if (!importListingUrl || !extId || images.length === 0) {
      continue;
    }

    const neighborhood =
      summary?.neighborhood ||
      exportRow.area ||
      exportRow.city ||
      'Naples';
    const amenityNames =
      NEIGHBORHOOD_AMENITIES[neighborhood] || NEIGHBORHOOD_AMENITIES['Naples'];
    const amenities = amenityNames.map((name) => ({
      name,
      category: AMENITY_CATEGORIES[name] || 'Other',
      isAvailable: true,
    }));

    const propertyType =
      summary?.propType === 'house'
        ? 'house'
        : summary?.propType === 'villa'
          ? 'townhouse'
          : 'condo';
    const unitType =
      propertyType === 'house'
        ? 'loft'
        : propertyType === 'townhouse'
          ? 'penthouse'
          : 'apartment';
    const bedrooms = summary?.beds || exportRow.bedrooms || 2;
    const bathrooms = summary?.baths || exportRow.bathrooms || 2;
    const pricePerNight = summary?.pricePerNight || parseUsdAmount(exportRow.price_per_night) || 125;
    const monthlyRent = summary?.monthlyRent || Math.round(pricePerNight * 30);
    const squareFootage = Math.max(650, bedrooms * 550 + bathrooms * 150 + 300);

    const doc = {
      name: summary?.name || exportRow.title || `VMS ${extId}`,
      description:
        summary?.description ||
        exportRow.description ||
        `Beautiful ${propertyType} in ${neighborhood}, Naples, FL.`,
      type: propertyType,
      status: 'available',
      propertyCode: summary?.code || `VMS-${extId}`,
      address: {
        street: exportRow.address || 'Address on file',
        city: exportRow.city || 'Naples',
        state: /^florida$/i.test(exportRow.state || '') ? 'FL' : (exportRow.state || 'FL'),
        zipCode: exportRow.zip || '34119',
        country: exportRow.country || 'United States',
      },
      images,
      mainImage: images[0],
      amenities,
      units: [
        {
          unitNumber: summary?.code || `VMS-${extId}`,
          unitType,
          bedrooms,
          bathrooms,
          squareFootage,
          rentAmount: monthlyRent,
          securityDeposit: monthlyRent,
          status: 'available',
          isAvailable: true,
          features: [],
          amenities: [],
          appliances: [],
          images: images.slice(0, 10),
          floorPlan: null,
          notes: '',
          leaseTerms: { minLeaseTerm: 30, maxLeaseTerm: 365, availableDate: now },
          utilities: {
            water: true,
            electricity: false,
            gas: false,
            internet: false,
            trash: true,
            sewage: true,
          },
          petsAllowed: false,
          smokingAllowed: false,
          parkingSpaces: 1,
          storageIncluded: false,
          lastInspectionDate: null,
          nextInspectionDate: null,
        },
      ],
      bedrooms,
      bathrooms,
      squareFootage,
      yearBuilt: 2005,
      parkingSpaces: 1,
      isPublic: true,
      isFeatured: prepared < 6,
      tags: [neighborhood, propertyType, 'Naples', 'Florida', 'Vacation Rental'],
      sourceUrl: importListingUrl,
      pricePerNight,
      monthlyRent,
      neighborhood,
      importSource: VMS_SOURCE,
      importExternalId: extId,
      importListingUrl,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      ...(ownerId ? { ownerId } : {}),
      ...(managerId ? { managerId } : {}),
    };

    const { createdAt, ...docForSet } = doc;

    operations.push({
      updateOne: {
        filter: {
          importSource: VMS_SOURCE,
          $or: [
            { importExternalId: extId },
            { importListingUrl },
          ],
        },
        update: {
          $set: docForSet,
          $setOnInsert: {
            createdAt: now,
          },
        },
        upsert: true,
      },
    });
    prepared++;
  }

  if (operations.length === 0) {
    console.log('  No bundled VMS properties were eligible for import');
    return;
  }

  await db.collection('properties').bulkWrite(operations, { ordered: false });
  console.log(`  Seeded or refreshed ${prepared} official VMS properties from bundled data`);
}

async function run() {
  let uri = process.env.MONGODB_URI || '';
  if (uri.includes('=') && !uri.startsWith('mongodb')) uri = uri.substring(uri.indexOf('=')+1).trim();

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const db = mongoose.connection.db;

    const propCount = await db.collection('properties').countDocuments({ deletedAt: null });
    const vmsPropCount = await db
      .collection('properties')
      .countDocuments({ deletedAt: null, importSource: VMS_SOURCE });
    const userCount = await db.collection('users').countDocuments();

    console.log(`Auto-seed check: ${propCount} active properties, ${vmsPropCount} VMS properties, ${userCount} users`);

    if (userCount === 0 && DEMO_AUTH_ENABLED) {
      console.log('Users collection empty and demo auth enabled — seeding demo users...');
      await seedUsers(db);
    } else if (userCount === 0) {
      await seedRequiredDemoUsers(db);
    } else {
      console.log(`  ${userCount} users already exist, skipping`);
    }

    if (vmsPropCount === 0) {
      console.log('No active VMS properties found — seeding official rentals from bundled VMS data...');
      await seedProperties(db);
    } else {
      console.log(`  ${vmsPropCount} VMS properties already exist, skipping`);
    }

    const promoCount = await db.collection('promocodes').countDocuments();
    if (promoCount === 0) {
      await db.collection('promocodes').insertMany([
        {
          code: 'WELCOME10',
          description: '10% off your first booking',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          usedCount: 0,
          minNights: 3,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          code: 'SUMMER25',
          description: '$25 off summer stays',
          discountType: 'fixed',
          discountValue: 25,
          maxUses: 50,
          usedCount: 0,
          minNights: 5,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      console.log('  Seeded 2 promo codes (WELCOME10, SUMMER25)');
    }

    await mongoose.disconnect();
    console.log('Auto-seed complete');
  } catch (e) {
    console.error('Auto-seed error:', e.message);
    process.exit(0); // Don't fail startup if seed fails
  }
}

run();
