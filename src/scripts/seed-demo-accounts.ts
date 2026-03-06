/**
 * SmartStartPM - Demo Accounts Seed Script
 * Creates demo accounts for testing and demonstration purposes
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

const DEMO_ACCOUNTS = [
  {
    email: 'hi@smartstart.us',
    password: 'Admin123$',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'admin',
    phone: '+1234567890',
    isActive: true,
    emailVerified: new Date(),
  },
  {
    email: 'manager@smartstart.us',
    password: 'Manager123$',
    firstName: 'Property',
    lastName: 'Manager',
    role: 'manager',
    phone: '+1234567891',
    isActive: true,
    emailVerified: new Date(),
  },
  {
    email: 'owner@smartstart.us',
    password: 'Owner123$',
    firstName: 'Property',
    lastName: 'Owner',
    role: 'owner',
    phone: '+1234567894',
    isActive: true,
    emailVerified: new Date(),
  },
  {
    email: 'tenant@smartstart.us',
    password: 'Tenant123$',
    firstName: 'Demo',
    lastName: 'Tenant',
    role: 'tenant',
    phone: '+1234567892',
    isActive: true,
    emailVerified: new Date(),
    // Tenant-specific fields
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

/**
 * Seed demo accounts
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

    // Delete existing demo accounts

    const demoEmails = DEMO_ACCOUNTS.map(account => account.email);
    const deleteResult = await User.deleteMany({ email: { $in: demoEmails } });

    // Create demo accounts

    const createdAccounts = [];
    for (const accountData of DEMO_ACCOUNTS) {
      try {
        const account = new User(accountData);
        await account.save();
        createdAccounts.push(account);


      } catch (error: any) {
        console.error(`   ❌ Failed to create ${accountData.email}:`, error.message);
      }
    }










  } catch (error: any) {
    console.error('❌ Error seeding demo accounts:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();

    process.exit(0);
  }
}

// Run the seed function
seedDemoAccounts();
