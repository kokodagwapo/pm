/**
 * SmartStartPM - Property Pricing Seed Script
 * Creates pricing configurations for SmartStartPM properties
 * Includes weekday/weekend rates and long-term discounts
 *
 * Usage: npm run seed:pricing
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import Property from '../models/Property';
import PropertyPricing from '../models/PropertyPricing';
import User from '../models/User';

// Pricing configurations based on SmartStartPM rates
const PRICING_CONFIGS: Record<string, {
  baseRate: number;
  weekdayRate: number;
  weekendRate: number;
  cleaningFee: number;
  securityDeposit: number;
  minStay: number;
}> = {
  // Condos - base around $130-185/night
  'C442-LV': { baseRate: 130, weekdayRate: 120, weekendRate: 150, cleaningFee: 170, securityDeposit: 500, minStay: 7 },
  'C373-WTC': { baseRate: 130, weekdayRate: 120, weekendRate: 145, cleaningFee: 150, securityDeposit: 500, minStay: 7 },
  'C442-RW': { baseRate: 155, weekdayRate: 145, weekendRate: 175, cleaningFee: 170, securityDeposit: 500, minStay: 7 },
  'C456-OD': { baseRate: 130, weekdayRate: 120, weekendRate: 150, cleaningFee: 150, securityDeposit: 500, minStay: 7 },
  'C96-JC': { baseRate: 155, weekdayRate: 145, weekendRate: 175, cleaningFee: 170, securityDeposit: 500, minStay: 7 },
  'C91-CS': { baseRate: 166, weekdayRate: 155, weekendRate: 190, cleaningFee: 180, securityDeposit: 500, minStay: 7 },
  'C381-OF': { baseRate: 155, weekdayRate: 145, weekendRate: 180, cleaningFee: 170, securityDeposit: 500, minStay: 7 },
  'C122-MF': { baseRate: 166, weekdayRate: 155, weekendRate: 190, cleaningFee: 180, securityDeposit: 500, minStay: 7 },
  'C447-OF': { baseRate: 185, weekdayRate: 170, weekendRate: 210, cleaningFee: 200, securityDeposit: 750, minStay: 7 },
  'C83-CS': { baseRate: 140, weekdayRate: 130, weekendRate: 160, cleaningFee: 160, securityDeposit: 500, minStay: 7 },
  'C44-MF': { baseRate: 166, weekdayRate: 155, weekendRate: 190, cleaningFee: 180, securityDeposit: 500, minStay: 7 },
  'C453-JC': { baseRate: 160, weekdayRate: 150, weekendRate: 185, cleaningFee: 175, securityDeposit: 500, minStay: 7 },
  
  // Houses - higher rates
  'H190-VW': { baseRate: 190, weekdayRate: 175, weekendRate: 220, cleaningFee: 250, securityDeposit: 1000, minStay: 5 },
  'H437-ML': { baseRate: 275, weekdayRate: 250, weekendRate: 325, cleaningFee: 350, securityDeposit: 1500, minStay: 5 },
  
  // Villa - premium rates
  'V452-MC': { baseRate: 260, weekdayRate: 240, weekendRate: 300, cleaningFee: 300, securityDeposit: 1000, minStay: 5 },
};

// Long-term discount tiers
const LONG_TERM_DISCOUNTS = [
  { minNights: 7, discountPercent: 5, label: 'Weekly Stay' },
  { minNights: 14, discountPercent: 10, label: 'Bi-Weekly Stay' },
  { minNights: 28, discountPercent: 15, label: 'Monthly Stay' },
  { minNights: 60, discountPercent: 20, label: '2+ Month Stay' },
  { minNights: 90, discountPercent: 25, label: 'Seasonal Stay' },
];

// Seasonal rate adjustments (Naples high season Dec-Apr)
const SEASONAL_RATES = [
  {
    name: 'Peak Season',
    startMonth: 1, // January
    endMonth: 4, // April
    multiplier: 1.25,
  },
  {
    name: 'Holiday Season',
    startMonth: 12, // December
    endMonth: 12,
    multiplier: 1.35,
  },
  {
    name: 'Summer Value',
    startMonth: 6, // June
    endMonth: 8, // August
    multiplier: 0.85,
  },
];

async function seedPropertyPricing() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env.local');
    }

    console.log('💰 SmartStartPM Property Pricing Seed Script');
    console.log('=============================================\n');

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get admin user for createdBy field
    const adminUser = await User.findOne({ email: 'hi@smartstart.us' });
    if (!adminUser) {
      throw new Error('Admin user not found. Please run seed:demo first.');
    }

    // Get all SmartStartPM properties
    const properties = await Property.find({
      'units.unitNumber': { $regex: /^(C|H|V)\d+-/ }
    });

    if (properties.length === 0) {
      throw new Error('No SmartStartPM properties found. Please run seed:properties first.');
    }

    console.log(`📋 Found ${properties.length} SmartStartPM properties\n`);

    // Delete existing pricing for these properties
    const propertyIds = properties.map(p => p._id);
    const deletedResult = await PropertyPricing.deleteMany({
      propertyId: { $in: propertyIds }
    });
    console.log(`🗑️  Deleted ${deletedResult.deletedCount} existing pricing records\n`);

    // Create pricing for each property
    console.log('💵 Creating property pricing configurations...\n');
    
    let created = 0;
    for (const property of properties) {
      try {
        const unit = property.units?.[0];
        if (!unit) continue;

        const unitCode = unit.unitNumber;
        const config = PRICING_CONFIGS[unitCode];
        
        if (!config) {
          console.log(`   ⚠️  No pricing config for ${property.name} (${unitCode})`);
          continue;
        }

        // Build seasonal rates array with actual dates
        const currentYear = new Date().getFullYear();
        const seasonalRates = SEASONAL_RATES.map(season => {
          const startDate = new Date(currentYear, season.startMonth - 1, 1);
          const endDate = new Date(
            season.endMonth === 12 ? currentYear : currentYear,
            season.endMonth,
            0
          );
          
          return {
            name: season.name,
            startDate,
            endDate,
            rate: Math.round(config.baseRate * season.multiplier),
          };
        });

        const pricing = new PropertyPricing({
          propertyId: property._id,
          unitId: unit._id,
          baseRate: config.baseRate,
          rateType: 'nightly',
          weekdayRate: config.weekdayRate,
          weekendRate: config.weekendRate,
          discounts: LONG_TERM_DISCOUNTS.map(d => ({
            minDays: d.minNights,
            value: d.discountPercent,
            discountType: 'percentage',
            label: d.label,
          })),
          seasonalRates: seasonalRates.map(sr => ({
            ...sr,
            label: sr.name,
          })),
          minimumStay: config.minStay,
          maximumStay: 180,
          cleaningFee: config.cleaningFee,
          serviceFee: Math.round(config.baseRate * 0.12),
          securityDeposit: config.securityDeposit,
          currency: 'USD',
          isActive: true,
          createdBy: adminUser._id,
        });

        await pricing.save();
        created++;
        console.log(`   ✅ ${property.name}: $${config.baseRate}/night (${config.weekdayRate}/${config.weekendRate} wd/we)`);
      } catch (error: any) {
        console.error(`   ❌ Failed to create pricing for ${property.name}:`, error.message);
      }
    }

    console.log(`\n=============================================`);
    console.log(`✅ Successfully created ${created}/${properties.length} pricing configurations`);
    console.log(`\n💰 Pricing features enabled:`);
    console.log(`   - Weekday/Weekend differential rates`);
    console.log(`   - ${LONG_TERM_DISCOUNTS.length} long-term discount tiers`);
    console.log(`   - ${SEASONAL_RATES.length} seasonal rate periods`);
    console.log(`   - Cleaning fees and service fees`);

  } catch (error: any) {
    console.error('❌ Error seeding pricing:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

seedPropertyPricing();
