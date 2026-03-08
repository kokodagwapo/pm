import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const DEMO_USERS = [
  { email: 'hi@smartstart.us', role: 'admin', firstName: 'Admin', lastName: 'User' },
  { email: 'manager@smartstart.us', role: 'manager', firstName: 'Maria', lastName: 'Manager' },
  { email: 'owner@smartstart.us', role: 'owner', firstName: 'Oliver', lastName: 'Owner' },
  { email: 'tenant@smartstart.us', role: 'tenant', firstName: 'Tina', lastName: 'Tenant' },
];

async function seedUsers(db) {
  const existing = await db.collection('users').countDocuments({ email: { $in: DEMO_USERS.map(u => u.email) } });
  if (existing > 0) {
    console.log(`  Users already exist (${existing}), skipping user seed`);
    return;
  }
  const hash = await bcrypt.hash('SmartStart2025', 12);
  const now = new Date();
  const users = DEMO_USERS.map(u => ({
    ...u,
    password: hash,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  await db.collection('users').insertMany(users);
  console.log(`  Seeded ${users.length} demo users`);
}

async function seedProperties(db) {
  const dataPath = resolve(__dirname, '../../data/vms-properties.json');
  const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
  const now = new Date();
  const docs = raw.map((prop, i) => {
    const addrBase = NEIGHBORHOOD_ADDRESSES[prop.neighborhood] || NEIGHBORHOOD_ADDRESSES['Naples'];
    const address = { ...addrBase, country: 'United States' };
    const streetNum = parseInt(address.street) || 1000;
    address.street = address.street.replace(/^\d+/, String(streetNum + i * 10));

    const amenityNames = NEIGHBORHOOD_AMENITIES[prop.neighborhood] || NEIGHBORHOOD_AMENITIES['Naples'];
    const amenities = amenityNames.map(n => ({ name: n, category: AMENITY_CATEGORIES[n] || 'Other', isAvailable: true }));

    const images = prop.images
      .filter(img => img.includes('/uploads/') && !img.includes('site-icon') && !img.includes('favicon'))
      .slice(0, 15);

    const unit = {
      unitNumber: `${i + 1}01`,
      unitType: prop.propType === 'house' ? 'house' : 'condo',
      bedrooms: prop.beds,
      bathrooms: prop.baths,
      squareFeet: prop.beds * 550 + prop.baths * 150 + 450,
      rentAmount: prop.monthlyRent,
      depositAmount: prop.monthlyRent,
      status: 'available',
      isAvailable: true,
      features: [], amenities: [], appliances: [], images: images.slice(0, 5),
      floorPlan: null, notes: '',
      leaseTerms: { minLeaseTerm: 30, maxLeaseTerm: 365, availableDate: now },
      utilities: { water: true, electricity: false, gas: false, internet: false, trash: true, sewage: true },
      petsAllowed: false, smokingAllowed: false, parkingSpaces: 1, storageIncluded: false,
      lastInspectionDate: null, nextInspectionDate: null,
    };

    return {
      name: prop.name,
      description: prop.description || `Beautiful ${prop.propType} in ${prop.neighborhood}, Naples, FL.`,
      type: prop.propType === 'house' ? 'house' : 'condo',
      status: 'available',
      propertyCode: prop.code,
      address,
      images: images.length > 0 ? images : [prop.ogImage].filter(Boolean),
      mainImage: prop.ogImage || images[0] || '',
      amenities,
      units: [unit],
      bedrooms: prop.beds,
      bathrooms: prop.baths,
      squareFeet: unit.squareFeet,
      yearBuilt: 2000 + Math.floor(Math.random() * 22),
      parkingSpaces: 1,
      isPublic: true,
      isFeatured: i < 6,
      tags: [prop.neighborhood, prop.propType, 'Naples', 'Florida', 'Vacation Rental'],
      sourceUrl: prop.url,
      pricePerNight: prop.pricePerNight,
      monthlyRent: prop.monthlyRent,
      createdAt: now,
      updatedAt: now,
    };
  });

  await db.collection('properties').insertMany(docs);
  console.log(`  Seeded ${docs.length} properties from VMS Florida`);
}

async function run() {
  let uri = process.env.MONGODB_URI || '';
  if (uri.includes('=') && !uri.startsWith('mongodb')) uri = uri.substring(uri.indexOf('=')+1).trim();

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const db = mongoose.connection.db;

    const propCount = await db.collection('properties').countDocuments();
    const userCount = await db.collection('users').countDocuments();

    console.log(`Auto-seed check: ${propCount} properties, ${userCount} users`);

    if (propCount === 0) {
      console.log('Properties collection empty — seeding from VMS Florida data...');
      await seedProperties(db);
    } else {
      console.log(`  ${propCount} properties already exist, skipping`);
    }

    if (userCount === 0) {
      console.log('Users collection empty — seeding demo users...');
      await seedUsers(db);
    } else {
      console.log(`  ${userCount} users already exist, skipping`);
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
