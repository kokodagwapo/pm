/**
 * SmartStartPM - Property Owners Seed Script
 * Creates sample property owners with detailed profiles and links them to properties
 *
 * Usage: npm run seed:owners
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import User from '../models/User';
import Property from '../models/Property';

// Sample property owners with realistic Florida profiles
const PROPERTY_OWNERS = [
  {
    email: 'maria.santos@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'Maria',
    lastName: 'Santos',
    role: 'owner',
    phone: '+1 (239) 555-0101',
    isActive: true,
    emailVerified: new Date(),
    bio: 'Experienced property investor with over 15 years in the Naples real estate market. Specializing in vacation rentals and long-term residential properties in Southwest Florida.',
    location: 'Naples, FL',
    city: 'Naples',
    address: '1250 Tamiami Trail N, Suite 200, Naples, FL 34102',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    propertyCount: 4,
  },
  {
    email: 'james.wellington@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'James',
    lastName: 'Wellington',
    role: 'owner',
    phone: '+1 (239) 555-0102',
    isActive: true,
    emailVerified: new Date(),
    bio: 'Retired executive turned real estate investor. Owns multiple vacation condos in Falling Waters community. Passionate about providing quality accommodations for visitors to beautiful Naples.',
    location: 'Bonita Springs, FL',
    city: 'Bonita Springs',
    address: '28000 Imperial Parkway, Bonita Springs, FL 34135',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    propertyCount: 3,
  },
  {
    email: 'sarah.mitchell@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    role: 'owner',
    phone: '+1 (239) 555-0103',
    isActive: true,
    emailVerified: new Date(),
    bio: 'Real estate professional and property investor. Managing a growing portfolio of vacation rentals in Naples area communities including World Tennis Club and Falling Waters.',
    location: 'Naples, FL',
    city: 'Naples',
    address: '5801 Pelican Bay Blvd, Naples, FL 34108',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    propertyCount: 3,
  },
  {
    email: 'robert.chen@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'Robert',
    lastName: 'Chen',
    role: 'owner',
    phone: '+1 (239) 555-0104',
    isActive: true,
    emailVerified: new Date(),
    bio: 'Tech entrepreneur with a passion for real estate investing. Owns premium pool homes and luxury condos in Naples. Focused on providing high-end vacation experiences.',
    location: 'Marco Island, FL',
    city: 'Marco Island',
    address: '1000 N Collier Blvd, Marco Island, FL 34145',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    propertyCount: 3,
  },
  {
    email: 'lisa.anderson@smartstart.us',
    password: 'SmartStart2025',
    firstName: 'Lisa',
    lastName: 'Anderson',
    role: 'owner',
    phone: '+1 (239) 555-0105',
    isActive: true,
    emailVerified: new Date(),
    bio: 'Family-owned property business spanning three generations. Specializing in Falling Waters condos and Naples vacation properties. Committed to guest satisfaction and property excellence.',
    location: 'Naples, FL',
    city: 'Naples',
    address: '3400 Gulf Shore Blvd N, Naples, FL 34103',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    propertyCount: 2,
  },
];

// Property assignment mapping - distributes properties among owners
const PROPERTY_ASSIGNMENTS: { [ownerEmail: string]: string[] } = {
  'maria.santos@smartstart.us': [
    'Beautiful 2 Bed/2 Bath Lakeview Condo',
    'ROSEWOOD Condo, Falling Waters',
    'MAGNOLIA COVE Villa, Falling Waters',
    'JASMINE COURT Premium Condo',
  ],
  'james.wellington@smartstart.us': [
    'CASCADE Condo, Falling Waters',
    'ORCHID FALLS Condo, Falling Waters',
    'MAGNOLIA FALLS Condo with Outdoor Kitchen',
  ],
  'sarah.mitchell@smartstart.us': [
    'WOODLANDS Condo, World Tennis Club',
    'OLYMPIC DRIVE Condo, World Tennis Club',
    'JASMINE COURT Condo, Falling Waters',
  ],
  'robert.chen@smartstart.us': [
    'Whitten Drive Pool Home',
    'MOON LAKE Pool Home',
    'ORCHID FALLS Premium Condo',
  ],
  'lisa.anderson@smartstart.us': [
    'CASCADES Ground Floor Condo',
    'MAGNOLIA FALLS Preserve View Condo',
  ],
};

async function seedPropertyOwners() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env.local');
    }

    console.log('👥 SmartStartPM Property Owners Seed Script');
    console.log('============================================\n');

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get admin user for fallback
    const adminUser = await User.findOne({ email: 'hi@smartstart.us' });
    if (!adminUser) {
      console.log('⚠️  No admin user found. Please run seed:demo first.');
    }

    // Delete existing sample owners (keep the default owner@smartstart.us)
    const ownerEmails = PROPERTY_OWNERS.map(o => o.email);
    const deleteResult = await User.deleteMany({ email: { $in: ownerEmails } });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing sample owners\n`);

    // Create property owners
    console.log('👤 Creating property owners...\n');
    
    const createdOwners: { [email: string]: mongoose.Types.ObjectId } = {};
    
    for (const ownerData of PROPERTY_OWNERS) {
      try {
        const { propertyCount, ...userData } = ownerData;
        const owner = new User(userData);
        await owner.save();
        createdOwners[ownerData.email] = owner._id as mongoose.Types.ObjectId;
        console.log(`   ✅ ${ownerData.firstName} ${ownerData.lastName} (${ownerData.email})`);
        console.log(`      📍 ${ownerData.location} | 📞 ${ownerData.phone}`);
      } catch (error: any) {
        console.error(`   ❌ Failed to create ${ownerData.email}:`, error.message);
      }
    }

    // Assign properties to owners
    console.log('\n🏠 Assigning properties to owners...\n');
    
    let assignedCount = 0;
    for (const [ownerEmail, propertyNames] of Object.entries(PROPERTY_ASSIGNMENTS)) {
      const ownerId = createdOwners[ownerEmail];
      if (!ownerId) {
        console.log(`   ⚠️  Owner ${ownerEmail} not found, skipping property assignment`);
        continue;
      }

      for (const propertyName of propertyNames) {
        try {
          const result = await Property.findOneAndUpdate(
            { name: propertyName, deletedAt: null },
            { ownerId: ownerId },
            { new: true }
          );
          
          if (result) {
            assignedCount++;
            console.log(`   ✅ "${propertyName}" → ${ownerEmail.split('@')[0]}`);
          } else {
            console.log(`   ⚠️  Property not found: "${propertyName}"`);
          }
        } catch (error: any) {
          console.error(`   ❌ Failed to assign "${propertyName}":`, error.message);
        }
      }
    }

    // Summary
    console.log('\n============================================');
    console.log('📊 SUMMARY');
    console.log('============================================');
    console.log(`✅ Created ${Object.keys(createdOwners).length} property owners`);
    console.log(`✅ Assigned ${assignedCount} properties to owners\n`);

    console.log('👥 Property Owners Created:');
    for (const owner of PROPERTY_OWNERS) {
      const propertiesAssigned = PROPERTY_ASSIGNMENTS[owner.email]?.length || 0;
      console.log(`   • ${owner.firstName} ${owner.lastName}`);
      console.log(`     Email: ${owner.email}`);
      console.log(`     Password: SmartStart2025`);
      console.log(`     Properties: ${propertiesAssigned}`);
      console.log('');
    }

    console.log('💡 Login credentials: All owners use password "SmartStart2025"');
    console.log('🔗 These owners are now linked to their respective properties');

  } catch (error: any) {
    console.error('❌ Error seeding property owners:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

seedPropertyOwners();
