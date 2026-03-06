import { readFileSync } from 'fs';
import mongoose from 'mongoose';

const AMENITY_CATEGORIES = {
  'Pool': 'Recreation', 'Private Pool': 'Recreation', 'Heated Pool': 'Recreation',
  'Tennis Courts': 'Recreation', 'Fitness Center': 'Recreation', 'Spa/Hot Tub': 'Recreation',
  'Golf Access': 'Recreation', 'Clubhouse': 'Recreation',
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

function makeAmenities(neighborhood) {
  const names = NEIGHBORHOOD_AMENITIES[neighborhood] || NEIGHBORHOOD_AMENITIES['Naples'];
  return names.map(n => ({ name: n, category: AMENITY_CATEGORIES[n] || 'Other', isAvailable: true }));
}

function makeUnit(prop, idx) {
  return {
    unitNumber: `${idx + 1}01`,
    unitType: prop.propType === 'house' ? 'house' : prop.propType === 'villa' ? 'villa' : 'condo',
    bedrooms: prop.beds,
    bathrooms: prop.baths,
    squareFeet: prop.beds * 550 + prop.baths * 150 + 450,
    rentAmount: prop.monthlyRent,
    depositAmount: prop.monthlyRent,
    status: 'available',
    isAvailable: true,
    features: [],
    amenities: [],
    appliances: [],
    images: prop.images.slice(0, 5),
    floorPlan: null,
    notes: '',
    leaseTerms: { minLeaseTerm: 30, maxLeaseTerm: 365, availableDate: new Date() },
    utilities: { water: true, electricity: false, gas: false, internet: false, trash: true, sewage: true },
    petsAllowed: false,
    smokingAllowed: false,
    parkingSpaces: 1,
    storageIncluded: false,
    lastInspectionDate: null,
    nextInspectionDate: null,
  };
}

function titleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
    .replace(/\s+/g, ' ').trim();
}

async function run() {
  let uri = process.env.MONGODB_URI || '';
  if (uri.includes('=') && !uri.startsWith('mongodb')) uri = uri.substring(uri.indexOf('=')+1).trim();
  
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');

  const raw = JSON.parse(readFileSync('/tmp/vms-properties.json', 'utf8'));
  console.log(`Importing ${raw.length} properties...`);

  // Clear existing properties (fresh import)
  await mongoose.connection.db.collection('properties').deleteMany({});
  console.log('Cleared existing properties');

  const now = new Date();
  const inserted = [];

  for (let i = 0; i < raw.length; i++) {
    const prop = raw[i];
    const addrBase = NEIGHBORHOOD_ADDRESSES[prop.neighborhood] || NEIGHBORHOOD_ADDRESSES['Naples'];
    const address = { ...addrBase, country: 'United States' };

    // Vary street number to make addresses unique
    address.street = address.street.replace(/^\d+/, String(parseInt(address.street) + i * 10 || (1000 + i * 10)));

    const cleanName = titleCase(prop.name
      .replace(/^(CASCADES|CASCADE|JASMINE|ROSEWOOD|ORCHID|MAGNOLIA|SNOWFLAKE|ARCTIC|FROSTY|NORTHWINDS|WOODLANDS|WATER|OLYMPIC|HARWICH|MOON|NAPLES|WHITTEN|MAGNOLIA)\s*/i, m => m.trim() + ' ')
      .replace(/–\s*$/, '').replace(/\s+/g, ' ').trim()
    );

    // Filter images - keep real property photos
    const images = prop.images
      .filter(img => img.includes('/uploads/') && !img.includes('site-icon') && !img.includes('favicon'))
      .slice(0, 15);
    const mainImage = prop.ogImage || images[0] || '';

    const unit = makeUnit(prop, i);
    const amenities = makeAmenities(prop.neighborhood);

    const propType = prop.propType === 'house' ? 'house' : prop.propType === 'villa' ? 'condo' : 'condo';

    const doc = {
      name: cleanName,
      description: prop.description || `Beautiful ${prop.propType} in ${prop.neighborhood}, Naples, FL.`,
      type: propType,
      status: 'available',
      propertyCode: prop.code,
      address,
      images: images.length > 0 ? images : [mainImage].filter(Boolean),
      mainImage,
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

    inserted.push(doc);
  }

  const result = await mongoose.connection.db.collection('properties').insertMany(inserted);
  console.log(`\nImported ${result.insertedCount} properties successfully!`);
  
  // Show summary
  const byNeighborhood = {};
  inserted.forEach(p => {
    const n = p.tags[0];
    byNeighborhood[n] = (byNeighborhood[n] || 0) + 1;
  });
  console.log('\nBy neighborhood:');
  Object.entries(byNeighborhood).forEach(([n, c]) => console.log(`  ${n}: ${c}`));

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
