/**
 * SmartStartPM - Property Seed Script
 * Creates properties based on SmartStartPM Realty listings
 * Uses Unsplash images for UGC-style property photos
 *
 * Usage: npm run seed:properties
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import Property from '../models/Property';
import User from '../models/User';

// UGC-style images from Unsplash for Florida vacation properties
const PROPERTY_IMAGES = {
  condo: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
  ],
  house: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
  ],
  villa: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',
  ],
  pool: [
    'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&q=80',
    'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?w=800&q=80',
  ],
  interior: [
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
  ],
  bedroom: [
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',
    'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&q=80',
  ],
  kitchen: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80',
  ],
  bathroom: [
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80',
    'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=800&q=80',
  ],
  florida: [
    'https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&q=80',
  ],
};

function getRandomImages(type: 'condo' | 'house' | 'villa', count: number = 5): string[] {
  const mainImages = PROPERTY_IMAGES[type];
  const allSupplementary = [
    ...PROPERTY_IMAGES.interior,
    ...PROPERTY_IMAGES.bedroom,
    ...PROPERTY_IMAGES.kitchen,
    ...PROPERTY_IMAGES.bathroom,
    ...PROPERTY_IMAGES.pool,
  ];
  
  const shuffled = [...allSupplementary].sort(() => Math.random() - 0.5);
  const main = mainImages[Math.floor(Math.random() * mainImages.length)];
  
  return [main, ...shuffled.slice(0, count - 1)];
}

// SmartStartPM Properties Data
const VMS_FLORIDA_PROPERTIES = [
  {
    name: 'Beautiful 2 Bed/2 Bath Lakeview Condo',
    code: 'C442-LV',
    type: 'condo',
    description: `Welcome to your dream retreat in Falling Waters, a premier residential community nestled in the heart of Naples, Florida. This stunning modern lakeview condo offers an exquisite blend of luxury, comfort, and the breathtaking natural beauty that Southwest Florida is renowned for.

As you step into this beautifully designed condo, you are greeted by an open-concept layout that maximizes space and light. The expansive living area features large windows that frame picturesque views of the serene lake and lush landscaping.

The modern kitchen is a chef's delight, equipped with stainless steel appliances, elegant quartz countertops, and ample cabinetry. Retreat to the luxurious master suite with a spacious walk-in closet and private en-suite bathroom.`,
    address: {
      street: '7050 Falling Waters Drive',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1200,
    rentAmount: 130,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Air Conditioning', 'WiFi', 'Kitchen', 'Washer/Dryer', 'Lake View', 'Lanai', 'Parking'],
    community: 'Falling Waters',
  },
  {
    name: 'WOODLANDS Condo, World Tennis Club',
    code: 'C373-WTC',
    type: 'condo',
    description: `Cozy coastal condo in the World Tennis Club in Naples, Florida. This charming 2-bedroom, 2-bathroom unit offers the perfect blend of comfort and convenience for your Naples getaway.

Enjoy access to world-class tennis facilities, a beautiful community pool, and well-maintained grounds. The condo features a fully equipped kitchen, comfortable living spaces, and a private lanai.

Located just minutes from Naples' famous beaches, shopping, and dining destinations.`,
    address: {
      street: '3650 Olympic Drive',
      city: 'Naples',
      state: 'FL',
      zipCode: '34105',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1100,
    rentAmount: 130,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Tennis Courts', 'Pool', 'Air Conditioning', 'WiFi', 'Kitchen', 'Parking', 'Lanai'],
    community: 'World Tennis Club',
  },
  {
    name: 'Whitten Drive Pool Home',
    code: 'H190-VW',
    type: 'house',
    description: `Beautiful single-family pool home in the heart of Naples. This spacious 3-bedroom, 2-bathroom home offers everything you need for an unforgettable Florida vacation.

The highlight of this property is the private heated pool and expansive lanai, perfect for entertaining or simply relaxing under the Florida sun. Inside, you'll find an open floor plan with modern furnishings, a fully equipped kitchen, and comfortable bedrooms.

Located in the desirable Villas of Whittenberg community, you're just minutes from Naples' best beaches, golf courses, and shopping.`,
    address: {
      street: '2891 Whitten Drive',
      city: 'Naples',
      state: 'FL',
      zipCode: '34109',
      country: 'USA',
    },
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1800,
    rentAmount: 190,
    rateType: 'nightly',
    maxGuests: 6,
    amenities: ['Private Pool', 'Air Conditioning', 'WiFi', 'Kitchen', 'Washer/Dryer', 'Garage', 'Lanai', 'BBQ Grill'],
    community: 'Villas of Whittenberg',
  },
  {
    name: 'ROSEWOOD Condo, Falling Waters',
    code: 'C442-RW',
    type: 'condo',
    description: `Airy, second-story lake-view Rosewood condo in Falling Waters. This beautifully appointed 2-bedroom, 2-bathroom condo offers stunning views and resort-style amenities.

Wake up to gorgeous lake views from your private lanai. The open floor plan features a well-equipped kitchen, comfortable living area, and two spacious bedrooms. The community offers multiple pools, tennis courts, and beautifully landscaped grounds.

Perfect for couples or small families looking for a relaxing Naples retreat.`,
    address: {
      street: '7015 Rosewood Lane',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1150,
    rentAmount: 155,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Tennis Courts', 'Air Conditioning', 'WiFi', 'Kitchen', 'Lake View', 'Lanai', 'Parking'],
    community: 'Falling Waters',
  },
  {
    name: 'OLYMPIC DRIVE Condo, World Tennis Club',
    code: 'C456-OD',
    type: 'condo',
    description: `Charming Ground-Floor Condo in World Tennis Club — Naples, Florida. This well-maintained 2-bedroom, 2-bathroom unit is perfect for tennis enthusiasts and those seeking a peaceful retreat.

Enjoy easy access from this ground-floor unit to the community's amenities including tennis courts, pool, and fitness center. The condo features updated finishes, a modern kitchen, and a relaxing lanai.

Ideally located near Naples' top attractions, beaches, and dining options.`,
    address: {
      street: '3680 Olympic Drive',
      city: 'Naples',
      state: 'FL',
      zipCode: '34105',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1050,
    rentAmount: 130,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Tennis Courts', 'Pool', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Kitchen', 'Lanai'],
    community: 'World Tennis Club',
  },
  {
    name: 'JASMINE COURT Condo, Falling Waters',
    code: 'C96-JC',
    type: 'condo',
    description: `Coastal second-floor condo in Jasmine Court offers a quiet setting in the heart of Falling Waters. This 2-bedroom, 2-bathroom unit provides the perfect balance of privacy and community amenities.

Relax on your private lanai overlooking the beautifully landscaped grounds. The condo features a modern kitchen, comfortable living spaces, and two well-appointed bedrooms with quality linens.

Just seconds away from the resort-style pool and walking distance to the community's waterfall feature.`,
    address: {
      street: '7030 Jasmine Court',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1100,
    rentAmount: 155,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Air Conditioning', 'WiFi', 'Kitchen', 'Washer/Dryer', 'Lanai', 'Parking'],
    community: 'Falling Waters',
  },
  {
    name: 'CASCADE Condo, Falling Waters',
    code: 'C91-CS',
    type: 'condo',
    description: `Fountain view Cascades condo with furnished lanai in the prestigious Falling Waters community. This stunning 2-bedroom, 2-bathroom unit offers views of the community's signature waterfall.

The spacious lanai is perfect for outdoor dining with its furnished seating area. Inside, enjoy a fully equipped kitchen, comfortable living room, and two bedrooms designed for restful sleep.

Resort-style amenities include multiple pools, tennis courts, and miles of walking paths through tropical landscaping.`,
    address: {
      street: '7045 Cascade Lane',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1175,
    rentAmount: 166,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Tennis Courts', 'Fountain View', 'Air Conditioning', 'WiFi', 'Kitchen', 'Furnished Lanai'],
    community: 'Falling Waters',
  },
  {
    name: 'ORCHID FALLS Condo, Falling Waters',
    code: 'C381-OF',
    type: 'condo',
    description: `Beautiful lake-view sunsets from the second-story lanai of this Orchid Falls condo. This 2-bedroom, 2-bathroom unit offers some of the best views in Falling Waters.

Watch stunning Florida sunsets over the lake from your private lanai. The interior features modern updates, a well-appointed kitchen, and comfortable bedrooms with quality furnishings.

Falling Waters offers resort-style amenities including pools, tennis, and a clubhouse.`,
    address: {
      street: '7025 Orchid Falls Way',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1125,
    rentAmount: 155,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Tennis Courts', 'Lake View', 'Air Conditioning', 'WiFi', 'Kitchen', 'Lanai', 'Sunset Views'],
    community: 'Falling Waters',
  },
  {
    name: 'MAGNOLIA FALLS Condo with Outdoor Kitchen',
    code: 'C122-MF',
    type: 'condo',
    description: `Second-story condo in Magnolia Falls with an outdoor kitchen - a rare find in Falling Waters! This 2-bedroom, 2-bathroom unit is perfect for those who love to entertain.

The highlight is the lanai featuring a built-in outdoor kitchen with grill, sink, and mini-fridge. Inside, enjoy updated finishes, a modern kitchen, and two spacious bedrooms.

Take advantage of Falling Waters' resort amenities including multiple pools and tennis courts.`,
    address: {
      street: '7060 Magnolia Falls Drive',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1200,
    rentAmount: 166,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Outdoor Kitchen', 'BBQ Grill', 'Air Conditioning', 'WiFi', 'Kitchen', 'Lanai'],
    community: 'Falling Waters',
  },
  {
    name: 'ORCHID FALLS Premium Condo',
    code: 'C447-OF',
    type: 'condo',
    description: `Beautiful upgraded Orchid Falls condo with private second-story lake views. This premium 2-bedroom, 2-bathroom unit features high-end finishes throughout.

Upgraded features include granite countertops, stainless steel appliances, tile flooring, and designer furnishings. The private lanai offers peaceful lake views and is perfect for morning coffee or evening relaxation.

Enjoy all of Falling Waters' amenities including pools, tennis, and fitness center.`,
    address: {
      street: '7035 Orchid Falls Way',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1175,
    rentAmount: 185,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Fitness Center', 'Lake View', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'Designer Furnishings'],
    community: 'Falling Waters',
  },
  {
    name: 'MOON LAKE Pool Home',
    code: 'H437-ML',
    type: 'house',
    description: `Spacious modern pool home in Moon Lake is perfect for a group of adults or family vacation. This stunning 4-bedroom, 3-bathroom home offers luxury living in Naples.

The heated private pool and spa are surrounded by a beautifully landscaped backyard with plenty of space for outdoor entertaining. Inside, the open floor plan features a gourmet kitchen, spacious living areas, and four comfortable bedrooms.

Located in the desirable Moon Lake community with easy access to Naples' beaches, golf, and dining.`,
    address: {
      street: '4520 Moon Lake Drive',
      city: 'Naples',
      state: 'FL',
      zipCode: '34109',
      country: 'USA',
    },
    bedrooms: 4,
    bathrooms: 3,
    squareFootage: 2400,
    rentAmount: 275,
    rateType: 'nightly',
    maxGuests: 8,
    amenities: ['Private Pool', 'Spa/Hot Tub', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'Washer/Dryer', 'Garage', 'BBQ Grill'],
    community: 'Moon Lake',
  },
  {
    name: 'CASCADES Ground Floor Condo',
    code: 'C83-CS',
    type: 'condo',
    description: `Ground-floor Cascades condo with an outdoor kitchen in Falling Waters. This accessible 2-bedroom, 2-bathroom unit is perfect for those who prefer single-level living.

Step right out to your private lanai with built-in outdoor kitchen. The ground-floor location provides easy access to the community pool and amenities. Inside, enjoy modern finishes and comfortable furnishings.

Falling Waters offers a true resort lifestyle with pools, tennis, and beautiful grounds.`,
    address: {
      street: '7040 Cascade Lane',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1100,
    rentAmount: 140,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Outdoor Kitchen', 'Ground Floor', 'Air Conditioning', 'WiFi', 'Kitchen', 'Easy Access'],
    community: 'Falling Waters',
  },
  {
    name: 'MAGNOLIA COVE Villa, Falling Waters',
    code: 'V452-MC',
    type: 'villa',
    description: `Luxurious 3-bedroom, 2-bathroom villa in the exclusive Magnolia Cove section of Falling Waters. This spacious villa offers more privacy and space than typical condos.

Features include a private garage, extended lanai, upgraded finishes throughout, and generous living spaces. The villa layout is perfect for families or groups seeking more room to spread out.

Enjoy Falling Waters' extensive amenities including multiple pools, tennis courts, and a clubhouse.`,
    address: {
      street: '7100 Magnolia Cove Lane',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1650,
    rentAmount: 260,
    rateType: 'nightly',
    maxGuests: 6,
    amenities: ['Pool', 'Private Garage', 'Extended Lanai', 'Air Conditioning', 'WiFi', 'Full Kitchen', 'Washer/Dryer'],
    community: 'Falling Waters',
  },
  {
    name: 'MAGNOLIA FALLS Preserve View Condo',
    code: 'C44-MF',
    type: 'condo',
    description: `Upgraded ground-floor condo in Magnolia Falls with peaceful preserve view from west-facing lanai. This 2-bedroom, 2-bathroom unit offers tranquility and natural beauty.

The west-facing lanai provides beautiful sunset views over the protected preserve. Inside, enjoy upgraded finishes, a modern kitchen, and two comfortable bedrooms.

Perfect location within Falling Waters - close to the pool while maintaining a peaceful setting.`,
    address: {
      street: '7055 Magnolia Falls Drive',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1150,
    rentAmount: 166,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Preserve View', 'Sunset Views', 'Ground Floor', 'Air Conditioning', 'WiFi', 'Kitchen'],
    community: 'Falling Waters',
  },
  {
    name: 'JASMINE COURT Premium Condo',
    code: 'C453-JC',
    type: 'condo',
    description: `Upgraded second-floor Jasmine Court condo only seconds away from the large resort-style pool. This premium 2-bedroom, 2-bathroom unit features the best upgrades in Falling Waters.

Premium features include hurricane impact windows, crown molding, upgraded appliances, and designer furniture. The location couldn't be better - just steps from the community's main pool.

Enjoy all of Falling Waters' resort amenities during your Naples vacation.`,
    address: {
      street: '7032 Jasmine Court',
      city: 'Naples',
      state: 'FL',
      zipCode: '34119',
      country: 'USA',
    },
    bedrooms: 2,
    bathrooms: 2,
    squareFootage: 1125,
    rentAmount: 160,
    rateType: 'nightly',
    maxGuests: 4,
    amenities: ['Pool', 'Hurricane Windows', 'Premium Upgrades', 'Air Conditioning', 'WiFi', 'Designer Kitchen'],
    community: 'Falling Waters',
  },
];

async function seedVMSFloridaProperties() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env.local');
    }

    console.log('🌴 SmartStartPM Property Seed Script');
    console.log('=====================================\n');

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get the owner user to assign properties
    const ownerUser = await User.findOne({ email: 'owner@smartstart.us' });
    const adminUser = await User.findOne({ email: 'hi@smartstart.us' });
    
    if (!ownerUser && !adminUser) {
      throw new Error('No owner or admin user found. Please run seed:demo first.');
    }

    const ownerId = ownerUser?._id || adminUser?._id;
    const managerId = adminUser?._id;

    console.log(`📋 Found owner: ${ownerUser?.email || adminUser?.email}`);
    console.log(`📋 Properties will be assigned to this owner\n`);

    // Delete existing SmartStartPM properties (by code pattern)
    const deletedResult = await Property.deleteMany({
      'units.unitNumber': { $regex: /^(C|H|V)\d+-/ }
    });
    console.log(`🗑️  Deleted ${deletedResult.deletedCount} existing SmartStartPM properties\n`);

    // Create properties
    console.log('🏠 Creating SmartStartPM properties...\n');
    
    let created = 0;
    for (const propData of VMS_FLORIDA_PROPERTIES) {
      try {
        const propertyType = propData.type === 'house' ? 'house' : 
                            propData.type === 'villa' ? 'townhouse' : 'condo';
        
        const images = getRandomImages(propData.type as 'condo' | 'house' | 'villa', 5);
        
        const unitType = propData.type === 'house' ? 'loft' : 
                        propData.type === 'villa' ? 'penthouse' : 'apartment';
        
        const property = new Property({
          name: propData.name,
          type: propertyType,
          description: propData.description,
          address: propData.address,
          ownerId: ownerId,
          managerId: managerId,
          status: 'available',
          isMultiUnit: false,
          totalUnits: 1,
          images: images,
          amenities: propData.amenities.map(name => ({
            name,
            category: getAmenityCategory(name),
          })),
          units: [{
            unitNumber: propData.code,
            unitType: unitType,
            floor: propData.code.includes('C') && !propData.description.toLowerCase().includes('ground') ? 2 : 1,
            bedrooms: propData.bedrooms,
            bathrooms: propData.bathrooms,
            squareFootage: propData.squareFootage,
            rentAmount: propData.rentAmount * 30,
            securityDeposit: 500,
            status: 'available',
            images: images,
            centralAir: true,
            dishwasher: true,
            inUnitLaundry: propData.amenities.includes('Washer/Dryer'),
            balcony: propData.amenities.includes('Lanai'),
            parking: {
              included: propData.amenities.includes('Parking') || propData.amenities.includes('Garage'),
              spaces: propData.amenities.includes('Garage') ? 2 : 1,
              type: propData.amenities.includes('Garage') ? 'garage' : 'open',
            },
            appliances: {
              refrigerator: true,
              stove: true,
              oven: true,
              microwave: true,
              dishwasher: true,
              washer: propData.amenities.includes('Washer/Dryer'),
              dryer: propData.amenities.includes('Washer/Dryer'),
            },
            utilities: {
              electricity: 'tenant',
              water: 'included',
              internet: 'included',
              cable: 'tenant',
              trash: 'included',
            },
          }],
        });

        await property.save();
        created++;
        console.log(`   ✅ ${propData.name} (${propData.code})`);
      } catch (error: any) {
        console.error(`   ❌ Failed to create ${propData.name}:`, error.message);
      }
    }

    console.log(`\n=====================================`);
    console.log(`✅ Successfully created ${created}/${VMS_FLORIDA_PROPERTIES.length} properties`);
    console.log(`\n🌴 SmartStartPM properties are ready!`);
    console.log(`   - ${VMS_FLORIDA_PROPERTIES.filter(p => p.type === 'condo').length} Condos`);
    console.log(`   - ${VMS_FLORIDA_PROPERTIES.filter(p => p.type === 'house').length} Houses`);
    console.log(`   - ${VMS_FLORIDA_PROPERTIES.filter(p => p.type === 'villa').length} Villas`);

  } catch (error: any) {
    console.error('❌ Error seeding properties:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

function getAmenityCategory(amenity: string): string {
  const categories: Record<string, string> = {
    'Pool': 'Recreation',
    'Private Pool': 'Recreation',
    'Tennis Courts': 'Recreation',
    'Fitness Center': 'Recreation',
    'Spa/Hot Tub': 'Recreation',
    'Air Conditioning': 'Climate',
    'WiFi': 'Utilities',
    'Kitchen': 'Kitchen',
    'Premium Kitchen': 'Kitchen',
    'Gourmet Kitchen': 'Kitchen',
    'Designer Kitchen': 'Kitchen',
    'Full Kitchen': 'Kitchen',
    'Washer/Dryer': 'Laundry',
    'Parking': 'Parking',
    'Garage': 'Parking',
    'Private Garage': 'Parking',
    'Lanai': 'Outdoor',
    'Furnished Lanai': 'Outdoor',
    'Extended Lanai': 'Outdoor',
    'Lake View': 'Living',
    'Preserve View': 'Living',
    'Sunset Views': 'Living',
    'Fountain View': 'Living',
    'BBQ Grill': 'Outdoor',
    'Outdoor Kitchen': 'Outdoor',
    'Ground Floor': 'Other',
    'Easy Access': 'Other',
    'Hurricane Windows': 'Security',
    'Premium Upgrades': 'Other',
    'Designer Furnishings': 'Living',
  };
  return categories[amenity] || 'Other';
}

seedVMSFloridaProperties();
