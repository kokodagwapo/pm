/**
 * SmartStartPM - Demo Seed Script
 * Creates demo accounts and properties for testing and demonstration purposes
 *
 * Usage: npm run seed:demo
 */

// IMPORTANT: Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Now import other modules after env is loaded
import mongoose from 'mongoose';
import User from '../models/User';
import { Property } from '../models';

const DEMO_ACCOUNTS = [
  {
    email: 'hi@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'admin',
    phone: '+1234567890',
    isActive: true,
    emailVerified: new Date(),
  },
  {
    email: 'manager@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'Property',
    lastName: 'Manager',
    role: 'manager',
    phone: '+1234567891',
    isActive: true,
    emailVerified: new Date(),
  },
  {
    email: 'owner@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'Property',
    lastName: 'Owner',
    role: 'owner',
    phone: '+1234567894',
    isActive: true,
    emailVerified: new Date(),
  },
  {
    email: 'tenant@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'Demo',
    lastName: 'Tenant',
    role: 'tenant',
    phone: '+1234567892',
    isActive: true,
    emailVerified: new Date(),
    dateOfBirth: new Date('1990-01-01'),
    tenantStatus: 'active',
    backgroundCheckStatus: 'approved',
    creditScore: 720,
    employmentInfo: {
      employer: 'Tech Corp',
      position: 'Software Engineer',
      income: 75000,
      startDate: new Date('2020-01-01'),
    },
    emergencyContacts: [
      {
        name: 'Emergency Contact',
        relationship: 'Family',
        phone: '+1234567893',
        email: 'emergency@example.com',
      },
    ],
  },
];

function buildDemoProperties(ownerId: string) {
  return [
    {
      name: 'Gulf Shore Retreat',
      description: 'Stunning beachfront condo with panoramic Gulf views, modern finishes, and resort-style amenities.',
      type: 'condo',
      status: 'available',
      address: { street: '1200 Gulf Shore Blvd N', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
      ownerId,
      isMultiUnit: false,
      totalUnits: 1,
      yearBuilt: 2018,
      amenities: [
        { name: 'Pool', category: 'Recreation' },
        { name: 'Gym', category: 'Recreation' },
        { name: 'Beachfront', category: 'Outdoor' },
      ],
      units: [
        { unitNumber: '101', unitType: 'apartment', bedrooms: 2, bathrooms: 2, squareFootage: 1200, rentAmount: 4500, securityDeposit: 4500, status: 'available', balcony: true, centralAir: true, inUnitLaundry: true },
      ],
    },
    {
      name: 'Park Shore Villa',
      description: 'Elegant single-family home in the heart of Park Shore, steps from the beach and upscale dining.',
      type: 'house',
      status: 'available',
      address: { street: '400 Park Shore Dr', city: 'Naples', state: 'FL', zipCode: '34103', country: 'United States' },
      ownerId,
      isMultiUnit: false,
      totalUnits: 1,
      yearBuilt: 2015,
      amenities: [
        { name: 'Pool', category: 'Recreation' },
        { name: 'Garage', category: 'Parking' },
      ],
      units: [
        { unitNumber: '1', unitType: 'apartment', bedrooms: 3, bathrooms: 2, squareFootage: 2100, rentAmount: 6800, securityDeposit: 6800, status: 'available', garden: true, centralAir: true, inUnitLaundry: true, walkInClosets: true },
      ],
    },
    {
      name: 'Old Naples Townhome',
      description: 'Charming townhome two blocks from 5th Avenue, fully renovated with high-end kitchen and rooftop terrace.',
      type: 'townhouse',
      status: 'available',
      address: { street: '720 5th Ave S', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
      ownerId,
      isMultiUnit: false,
      totalUnits: 1,
      yearBuilt: 2012,
      amenities: [
        { name: 'Rooftop Terrace', category: 'Outdoor' },
        { name: 'Walk to Beach', category: 'Outdoor' },
      ],
      units: [
        { unitNumber: 'A', unitType: 'apartment', bedrooms: 3, bathrooms: 3, squareFootage: 1800, rentAmount: 5200, securityDeposit: 5200, status: 'available', balcony: true, hardwoodFloors: true, centralAir: true, inUnitLaundry: true },
      ],
    },
    {
      name: 'Pelican Bay Studio',
      description: 'Bright studio in Pelican Bay with community pool, tennis courts, and private beach access.',
      type: 'condo',
      status: 'available',
      address: { street: '800 Pelican Bay Blvd', city: 'Naples', state: 'FL', zipCode: '34108', country: 'United States' },
      ownerId,
      isMultiUnit: false,
      totalUnits: 1,
      yearBuilt: 2005,
      amenities: [
        { name: 'Pool', category: 'Recreation' },
        { name: 'Tennis Court', category: 'Recreation' },
        { name: 'Private Beach Access', category: 'Outdoor' },
      ],
      units: [
        { unitNumber: '305', unitType: 'studio', bedrooms: 0, bathrooms: 1, squareFootage: 550, rentAmount: 2200, securityDeposit: 2200, status: 'available', centralAir: true, balcony: true },
      ],
    },
    {
      name: 'Moorings Bay Apartment',
      description: 'Waterfront apartment in the Moorings with boat dock access, open floor plan, and spectacular bay views.',
      type: 'apartment',
      status: 'available',
      address: { street: '1500 Moorings Dr', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
      ownerId,
      isMultiUnit: true,
      totalUnits: 2,
      yearBuilt: 2010,
      amenities: [
        { name: 'Boat Dock', category: 'Outdoor' },
        { name: 'Pool', category: 'Recreation' },
      ],
      units: [
        { unitNumber: '1A', unitType: 'apartment', bedrooms: 2, bathrooms: 2, squareFootage: 1100, rentAmount: 3800, securityDeposit: 3800, status: 'available', balcony: true, centralAir: true, inUnitLaundry: true },
        { unitNumber: '1B', unitType: 'apartment', bedrooms: 1, bathrooms: 1, squareFootage: 750, rentAmount: 2800, securityDeposit: 2800, status: 'available', balcony: true, centralAir: true },
      ],
    },
    {
      name: 'Vanderbilt Beach House',
      description: 'Spacious beach house near Vanderbilt Beach with private pool, outdoor kitchen, and easy beach access.',
      type: 'house',
      status: 'available',
      address: { street: '9100 Gulf Shore Dr', city: 'Naples', state: 'FL', zipCode: '34108', country: 'United States' },
      ownerId,
      isMultiUnit: false,
      totalUnits: 1,
      yearBuilt: 2019,
      amenities: [
        { name: 'Private Pool', category: 'Recreation' },
        { name: 'Outdoor Kitchen', category: 'Outdoor' },
        { name: 'Near Beach', category: 'Outdoor' },
      ],
      units: [
        { unitNumber: '1', unitType: 'apartment', bedrooms: 4, bathrooms: 3, squareFootage: 2800, rentAmount: 9500, securityDeposit: 9500, status: 'available', garden: true, centralAir: true, inUnitLaundry: true, walkInClosets: true, balcony: true },
      ],
    },
  ];
}

/**
 * Seed demo data
 */
async function seedDemoAccounts() {
  try {
    // Get MongoDB URI from environment, stripping any accidental KEY=value prefix
    let rawUri = process.env.MONGODB_URI;
    if (!rawUri) {
      throw new Error('MONGODB_URI is not defined');
    }
    if (rawUri.includes('=') && !rawUri.startsWith('mongodb')) {
      rawUri = rawUri.substring(rawUri.indexOf('=') + 1).trim();
    }
    const MONGODB_URI = rawUri;

    // Connect to database directly
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    // ── Users ──────────────────────────────────────────────────────────────
    const demoEmails = DEMO_ACCOUNTS.map(account => account.email);
    await User.deleteMany({ email: { $in: demoEmails } });

    const createdAccounts: any[] = [];
    for (const accountData of DEMO_ACCOUNTS) {
      try {
        const account = new User(accountData);
        await account.save();
        createdAccounts.push(account);
        console.log(`  ✅ Created user: ${accountData.email} (${accountData.role})`);
      } catch (error: any) {
        console.error(`  ❌ Failed to create ${accountData.email}:`, error.message);
      }
    }

    // ── Properties ────────────────────────────────────────────────────────
    const adminUser = createdAccounts.find(a => a.role === 'admin');
    if (adminUser) {
      const demoPropertyNames = buildDemoProperties(adminUser._id.toString()).map(p => p.name);
      await (Property as any).deleteMany({ name: { $in: demoPropertyNames } });

      const properties = buildDemoProperties(adminUser._id.toString());
      for (const propData of properties) {
        try {
          const property = new (Property as any)(propData);
          await property.save();
          console.log(`  ✅ Created property: ${propData.name}`);
        } catch (error: any) {
          console.error(`  ❌ Failed to create property ${propData.name}:`, error.message);
        }
      }
    } else {
      console.warn('  ⚠️  No admin user found, skipping property seeding');
    }

    console.log('\n✅ Demo seed complete.');

  } catch (error: any) {
    console.error('❌ Error seeding demo data:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the seed function
seedDemoAccounts();
