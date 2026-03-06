/**
 * SmartStartPM - FAQ Seed Script
 * Creates frequently asked questions based on SmartStartPM Realty content
 *
 * Usage: npm run seed:faq
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import FAQ from '../models/FAQ';
import User from '../models/User';

const VMS_FLORIDA_FAQS = [
  // Booking & Reservations
  {
    question: 'How do I book a vacation rental in Naples, Florida?',
    answer: `Booking your Naples vacation rental is easy! Simply browse our available properties, select your check-in and check-out dates, and click "Check Availability." You can also contact our team directly at +1 239-944-6627 for personalized assistance. We offer support in both English and German.`,
    category: 'general',
    keywords: ['booking', 'reservation', 'naples', 'vacation', 'rental'],
  },
  {
    question: 'What is the minimum stay requirement?',
    answer: `Our minimum stay requirements vary by property and season. Most condos have a 7-night minimum, while houses may have a 5-night minimum. During peak season (December through April), longer minimum stays may apply. Check individual property listings for specific requirements.`,
    category: 'leasing',
    keywords: ['minimum', 'stay', 'nights', 'requirement', 'season'],
  },
  {
    question: 'Can I request a custom stay or specific dates?',
    answer: `We're happy to accommodate custom stay requests when possible. Contact our team to discuss your specific needs - whether you need flexible check-in/check-out times, extended stays, or specific date requirements. We'll work with you to make your Naples vacation perfect.`,
    category: 'general',
    keywords: ['custom', 'flexible', 'dates', 'check-in', 'check-out'],
  },

  // Payments & Pricing
  {
    question: 'What fees are included in the rental price?',
    answer: `Our nightly rates include the base accommodation cost. Additional fees typically include:
    • Cleaning fee (one-time, varies by property)
    • City/tourism tax ($6 per day)
    • Service fee (12% of accommodation)
    • Security deposit (refundable, typically $500-$1,500)
    
    Some properties may have additional fees for extra guests, pets, or special requests. All fees are clearly displayed before booking confirmation.`,
    category: 'payments',
    keywords: ['fees', 'price', 'cleaning', 'tax', 'deposit', 'cost'],
  },
  {
    question: 'Do you offer discounts for longer stays?',
    answer: `Yes! We offer progressive discounts for extended stays:
    • 7+ nights: 5% discount
    • 14+ nights: 10% discount
    • 28+ nights (Monthly): 15% discount
    • 60+ nights: 20% discount
    • 90+ nights (Seasonal): 25% discount
    
    These discounts are automatically applied when you book eligible stays.`,
    category: 'payments',
    keywords: ['discount', 'weekly', 'monthly', 'long-term', 'seasonal'],
  },
  {
    question: 'What is your cancellation policy?',
    answer: `Our standard cancellation policy allows for a full refund (minus a small processing fee) if cancelled 30 or more days before check-in. Cancellations within 30 days may be subject to partial refunds or rebooking credits depending on the circumstances. Please review the specific terms for your booking or contact us for details.`,
    category: 'payments',
    keywords: ['cancellation', 'refund', 'policy', 'cancel'],
  },
  {
    question: 'What payment methods do you accept?',
    answer: `We accept major credit cards (Visa, MasterCard, American Express, Discover), debit cards, and bank transfers. For monthly or seasonal rentals, we can also arrange ACH payments. A valid credit card is required on file for the security deposit.`,
    category: 'payments',
    keywords: ['payment', 'credit card', 'bank', 'transfer', 'method'],
  },

  // Property & Amenities
  {
    question: 'What amenities are included in the vacation rentals?',
    answer: `All our Naples vacation rentals include:
    • Fully equipped kitchen with appliances
    • Air conditioning and ceiling fans
    • High-speed WiFi
    • Linens, towels, and bedding
    • Washer/dryer (most units)
    • Private lanai or balcony
    • Access to community pool
    • Free parking
    
    Many properties also feature private pools, tennis courts, lake views, and outdoor kitchens. Check individual listings for specific amenities.`,
    category: 'general',
    keywords: ['amenities', 'kitchen', 'wifi', 'pool', 'linens', 'included'],
  },
  {
    question: 'Do any properties have private pools?',
    answer: `Yes! Our houses and some villas feature private heated pools. The Whitten Drive Pool Home and Moon Lake Pool Home both have private pools and spas. Condos have access to resort-style community pools in Falling Waters and World Tennis Club.`,
    category: 'general',
    keywords: ['pool', 'private', 'heated', 'spa', 'swimming'],
  },
  {
    question: 'Are the properties pet-friendly?',
    answer: `Some of our properties accept pets with prior approval. Pet fees and restrictions apply. Please contact us before booking if you plan to bring a pet, as not all properties allow animals and there may be breed/size restrictions.`,
    category: 'general',
    keywords: ['pet', 'dog', 'cat', 'animal', 'pet-friendly'],
  },
  {
    question: 'What is Falling Waters community like?',
    answer: `Falling Waters is a premier residential community in Naples featuring:
    • Beautiful landscaping with the signature 80-foot waterfall
    • Multiple resort-style pools
    • Tennis and pickleball courts
    • Fitness center and clubhouse
    • Miles of walking paths
    • 24-hour gated security
    
    Located conveniently near beaches, shopping, and dining, it offers the perfect blend of relaxation and accessibility.`,
    category: 'general',
    keywords: ['falling waters', 'community', 'pool', 'tennis', 'amenities'],
  },

  // Check-in & Access
  {
    question: 'What time is check-in and check-out?',
    answer: `Standard check-in time is 4:00 PM and check-out is 10:00 AM. Early check-in or late check-out may be available upon request (subject to availability and possible additional fees). Please contact us if you need flexibility with your arrival or departure times.`,
    category: 'general',
    keywords: ['check-in', 'check-out', 'time', 'arrival', 'departure'],
  },
  {
    question: 'How do I access the property upon arrival?',
    answer: `Detailed access instructions are provided before your arrival, including:
    • Gate codes for gated communities
    • Keyless entry codes or lockbox instructions
    • Parking information
    • WiFi password
    • Property-specific details
    
    Our local team is available to assist with any access issues during your stay.`,
    category: 'general',
    keywords: ['access', 'key', 'code', 'entry', 'arrival', 'gate'],
  },

  // Location & Activities
  {
    question: 'How far are the properties from the beach?',
    answer: `Our Naples properties are conveniently located within 15-25 minutes of the Gulf beaches. Popular nearby beaches include Naples Beach, Vanderbilt Beach, and Delnor-Wiggins Pass State Park. We provide detailed directions and beach recommendations for our guests.`,
    category: 'general',
    keywords: ['beach', 'distance', 'gulf', 'naples', 'location'],
  },
  {
    question: 'What is there to do in Naples, Florida?',
    answer: `Naples offers endless activities:
    • Beautiful Gulf beaches and shelling
    • World-class golf courses
    • The elegant Fifth Avenue South shopping & dining
    • Everglades National Park excursions
    • Naples Botanical Garden
    • Artis—Naples performing arts
    • Fishing charters and boat tours
    • Tin City shopping and waterfront dining
    
    Our team is happy to provide recommendations tailored to your interests!`,
    category: 'general',
    keywords: ['activities', 'things to do', 'naples', 'beaches', 'golf', 'restaurants'],
  },

  // Maintenance & Support
  {
    question: 'What if something breaks or needs repair during my stay?',
    answer: `Contact us immediately for any maintenance issues! Our local team responds quickly to ensure your comfort:
    • Use the app messaging system for non-urgent issues
    • Call our emergency line for urgent matters
    • We have trusted local contractors on call
    
    We take pride in maintaining our properties and will address issues promptly.`,
    category: 'maintenance',
    keywords: ['maintenance', 'repair', 'broken', 'issue', 'emergency', 'support'],
  },
  {
    question: 'Is there 24/7 support available?',
    answer: `Yes! We provide 24/7 emergency support for our guests. For urgent issues like water leaks, power outages, or lockouts, call our emergency line anytime. For general questions or non-urgent matters, you can message us through the app and we'll respond during business hours.`,
    category: 'maintenance',
    keywords: ['support', 'emergency', '24/7', 'help', 'contact'],
  },

  // Property Owners
  {
    question: 'I own a property in Naples. Do you offer property management services?',
    answer: `Yes! SmartStartPM Realty offers comprehensive property management for Naples vacation homes:
    • Rental management (marketing, booking, guest services)
    • Regular property inspections
    • Maintenance coordination
    • Cleaning and turnover services
    • Financial reporting
    
    As property owners ourselves, we understand the importance of trusted local management. Contact us to discuss how we can help maximize your investment.`,
    category: 'general',
    keywords: ['owner', 'property management', 'investment', 'rental management'],
  },
  {
    question: 'How can property owners block dates for personal use?',
    answer: `Property owners can easily manage their calendar through our owner portal:
    • Log in with your owner credentials
    • Navigate to your property calendar
    • Select dates to block for personal use
    • Choose "Owner Hold" or "Blocked" status
    
    Blocked dates prevent new bookings and are reflected in real-time across all booking platforms.`,
    category: 'general',
    keywords: ['owner', 'block dates', 'calendar', 'personal use', 'availability'],
  },
];

async function seedFAQ() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env.local');
    }

    console.log('❓ SmartStartPM FAQ Seed Script');
    console.log('================================\n');

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

    // Delete existing FAQs
    const deletedResult = await FAQ.deleteMany({});
    console.log(`🗑️  Deleted ${deletedResult.deletedCount} existing FAQ entries\n`);

    // Create FAQs
    console.log('📝 Creating FAQ entries...\n');
    
    let created = 0;
    for (let i = 0; i < VMS_FLORIDA_FAQS.length; i++) {
      const faqData = VMS_FLORIDA_FAQS[i];
      try {
        const faq = new FAQ({
          question: faqData.question,
          answer: faqData.answer,
          category: faqData.category,
          keywords: faqData.keywords,
          isPublished: true,
          sortOrder: i + 1,
          viewCount: Math.floor(Math.random() * 100) + 10,
          helpfulCount: Math.floor(Math.random() * 50) + 5,
          notHelpfulCount: Math.floor(Math.random() * 5),
          createdBy: adminUser._id,
        });

        await faq.save();
        created++;
        console.log(`   ✅ ${faqData.question.substring(0, 50)}...`);
      } catch (error: any) {
        console.error(`   ❌ Failed to create FAQ:`, error.message);
      }
    }

    // Group by category for summary
    const categories = VMS_FLORIDA_FAQS.reduce((acc, faq) => {
      acc[faq.category] = (acc[faq.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n================================`);
    console.log(`✅ Successfully created ${created}/${VMS_FLORIDA_FAQS.length} FAQ entries`);
    console.log(`\n📊 FAQ Categories:`);
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} questions`);
    });

  } catch (error: any) {
    console.error('❌ Error seeding FAQs:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

seedFAQ();
