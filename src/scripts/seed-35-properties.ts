/**
 * SmartStartPM - 35 Properties Seed Script
 * Creates 35 Naples, FL area properties with curated Unsplash images
 * Covers condos, houses, villas, and apartments across Southwest Florida
 *
 * Usage: npm run seed:35
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import Property from '../models/Property';
import User from '../models/User';

// ---------------------------------------------------------------------------
// Curated Unsplash image pools by category
// ---------------------------------------------------------------------------
const IMAGES = {
  condo_exterior: [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=85',
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=85',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=85',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=85',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=85',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=85',
  ],
  house_exterior: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=85',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=85',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=900&q=85',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=85',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=85',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=85',
  ],
  villa_exterior: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=85',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900&q=85',
    'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=900&q=85',
    'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=900&q=85',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&q=85',
  ],
  apartment_exterior: [
    'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=900&q=85',
    'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=900&q=85',
    'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=900&q=85',
  ],
  living_room: [
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=85',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=85',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=85',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=85',
    'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=900&q=85',
    'https://images.unsplash.com/photo-1493663284031-b7e3aaa4b3b5?w=900&q=85',
  ],
  kitchen: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=85',
    'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=900&q=85',
    'https://images.unsplash.com/photo-1565183997392-2f6f122e5912?w=900&q=85',
    'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=900&q=85',
    'https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?w=900&q=85',
  ],
  bedroom: [
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=900&q=85',
    'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=900&q=85',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900&q=85',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=85',
    'https://images.unsplash.com/photo-1560185127-6a37a0fd2a4c?w=900&q=85',
  ],
  bathroom: [
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&q=85',
    'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=900&q=85',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=900&q=85',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=900&q=85',
  ],
  pool: [
    'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=900&q=85',
    'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?w=900&q=85',
    'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=900&q=85',
    'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=900&q=85',
  ],
  waterfront: [
    'https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=900&q=85',
    'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=900&q=85',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=85',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=900&q=85',
  ],
};

type ImgCategory = keyof typeof IMAGES;

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildImages(exterior: ImgCategory, count = 7): string[] {
  const supplementary: string[] = [
    ...IMAGES.living_room,
    ...IMAGES.kitchen,
    ...IMAGES.bedroom,
    ...IMAGES.bathroom,
    ...IMAGES.pool,
  ];
  const shuffled = [...supplementary].sort(() => Math.random() - 0.5);
  return [pick(IMAGES[exterior]), ...shuffled.slice(0, count - 1)];
}

// ---------------------------------------------------------------------------
// Amenity categories helper
// ---------------------------------------------------------------------------
const AMENITY_CATEGORIES: Record<string, string> = {
  'Pool': 'Recreation', 'Private Pool': 'Recreation', 'Heated Pool': 'Recreation',
  'Tennis Courts': 'Recreation', 'Fitness Center': 'Recreation', 'Spa/Hot Tub': 'Recreation',
  'Golf Access': 'Recreation', 'Clubhouse': 'Recreation', 'Bocce Ball': 'Recreation',
  'Air Conditioning': 'Climate', 'Central Air': 'Climate',
  'WiFi': 'Utilities', 'Cable TV': 'Utilities', 'Smart Home': 'Utilities',
  'Kitchen': 'Kitchen', 'Premium Kitchen': 'Kitchen', 'Gourmet Kitchen': 'Kitchen',
  'Designer Kitchen': 'Kitchen', 'Full Kitchen': 'Kitchen',
  'Washer/Dryer': 'Laundry', 'In-Unit Laundry': 'Laundry',
  'Parking': 'Parking', 'Garage': 'Parking', 'Private Garage': 'Parking', '2-Car Garage': 'Parking',
  'Lanai': 'Outdoor', 'Furnished Lanai': 'Outdoor', 'Extended Lanai': 'Outdoor',
  'Private Patio': 'Outdoor', 'Rooftop Terrace': 'Outdoor', 'BBQ Grill': 'Outdoor',
  'Outdoor Kitchen': 'Outdoor', 'Boat Dock': 'Outdoor', 'Fire Pit': 'Outdoor',
  'Lake View': 'Living', 'Gulf View': 'Living', 'Preserve View': 'Living',
  'Golf View': 'Living', 'Sunset Views': 'Living', 'Bay View': 'Living',
  'Hurricane Windows': 'Security', 'Gated Community': 'Security', 'Security System': 'Security',
  'Pet Friendly': 'Other', 'Ground Floor': 'Other', 'Elevator Access': 'Other',
  'Designer Furnishings': 'Living', 'Premium Upgrades': 'Other', 'Beachfront Access': 'Outdoor',
};

function amenityList(names: string[]) {
  return names.map(name => ({ name, category: AMENITY_CATEGORIES[name] || 'Other' }));
}

// ---------------------------------------------------------------------------
// 35 Properties
// ---------------------------------------------------------------------------
const PROPERTIES = [
  // ─────────── CONDOS (15) ───────────
  {
    code: 'C101', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Vanderbilt Beach Luxury Condo',
    address: { street: '11125 Gulf Shore Dr', city: 'Naples', state: 'FL', zipCode: '34108', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1350, rent: 4800, deposit: 4800,
    description: `Wake up to stunning Gulf views from this beautifully appointed 2-bed/2-bath condo steps from Vanderbilt Beach. The open floor plan features a chef's kitchen with quartz countertops, stainless appliances, and a large island. The primary suite offers direct bay views, walk-in closet, and spa-style bath. Community amenities include a resort pool, fitness center, and private beach access. Rental rates include utilities, cable, and WiFi — just bring your suitcase.`,
    amenities: ['Gulf View', 'Beachfront Access', 'Pool', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'Washer/Dryer', 'Lanai', 'Elevator Access', 'Parking'],
    community: 'Vanderbilt Beach',
  },
  {
    code: 'C102', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Gulf Shore Waterfront Condo',
    address: { street: '3443 Gulf Shore Blvd N', city: 'Naples', state: 'FL', zipCode: '34103', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1280, rent: 5200, deposit: 5200,
    description: `Enjoy breathtaking waterfront living in this fully furnished condo along prestigious Gulf Shore Blvd. This unit boasts a wraparound lanai with sweeping bay views, updated kitchen with premium appliances, and an elegantly furnished living area. The building features a rooftop pool, concierge service, and private beach access. Walk to world-class dining, galleries, and boutiques of Fifth Avenue South.`,
    amenities: ['Bay View', 'Pool', 'Rooftop Terrace', 'Gated Community', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'Washer/Dryer', 'Furnished Lanai', 'Elevator Access', 'Parking', 'Designer Furnishings'],
    community: 'Gulf Shore',
  },
  {
    code: 'C103', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Pelican Bay Tower Condo',
    address: { street: '6001 Pelican Bay Blvd', city: 'Naples', state: 'FL', zipCode: '34108', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2200, rent: 7500, deposit: 7500,
    description: `Premier high-rise living in the exclusive Pelican Bay community. This sprawling 3-bed/3-bath residence occupies a full floor with 270-degree Gulf and nature preserve views. Featuring a grand entry foyer, chef's kitchen, formal dining room, and expansive terraces. Pelican Bay amenities include two beachfront restaurants, tram service to private beaches, 18-hole golf, tennis, and fitness facilities. The pinnacle of Naples luxury living.`,
    amenities: ['Gulf View', 'Preserve View', 'Beachfront Access', 'Golf Access', 'Tennis Courts', 'Fitness Center', 'Pool', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', 'Extended Lanai', 'Elevator Access', '2-Car Garage', 'Gated Community', 'Designer Furnishings'],
    community: 'Pelican Bay',
  },
  {
    code: 'C104', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Moorings Bay Condo',
    address: { street: '2090 Gulf Shore Blvd N', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1450, rent: 5600, deposit: 5600,
    description: `Located in The Moorings, one of Naples' most sought-after neighborhoods, this recently renovated condo offers spectacular bay views. The gourmet kitchen was completely updated in 2022 with custom cabinetry, quartz surfaces, and a wine refrigerator. The light-filled living area opens onto a large screened lanai with a boat dock below. Enjoy deeded beach access at The Moorings Beach Park just minutes away.`,
    amenities: ['Bay View', 'Boat Dock', 'Beachfront Access', 'Pool', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'Washer/Dryer', 'Furnished Lanai', 'Parking', 'Security System'],
    community: 'The Moorings',
  },
  {
    code: 'C105', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Falling Waters Lakeview Condo',
    address: { street: '7050 Falling Waters Dr', city: 'Naples', state: 'FL', zipCode: '34119', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1200, rent: 3800, deposit: 3800,
    description: `Serene lakeview living in the award-winning Falling Waters community. This bright and airy condo features an open layout with views of the tranquil lake and lush tropical landscaping from every room. The kitchen was updated with granite counters and stainless appliances. Falling Waters features four resort-style pools, waterfall features, walking trails, and a friendly community atmosphere. Convenient to I-75, shopping, and dining.`,
    amenities: ['Lake View', 'Pool', 'Air Conditioning', 'WiFi', 'Kitchen', 'Washer/Dryer', 'Lanai', 'Parking', 'Gated Community'],
    community: 'Falling Waters',
  },
  {
    code: 'C106', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Park Shore Beachside Studio',
    address: { street: '4251 Gulf Shore Blvd N', city: 'Naples', state: 'FL', zipCode: '34103', country: 'United States' },
    bedrooms: 1, bathrooms: 1, sqft: 750, rent: 2800, deposit: 2800,
    description: `Charming coastal studio steps from Park Shore Beach. This efficiently designed unit offers a bright open living space with a fully equipped kitchen, queen Murphy bed, and a private balcony with partial Gulf views. The building has a beautiful beachside pool and direct access to the white sand beach. Perfect for a couple seeking an affordable Naples escape with everything within walking distance.`,
    amenities: ['Gulf View', 'Beachfront Access', 'Pool', 'Air Conditioning', 'WiFi', 'Full Kitchen', 'Lanai', 'Parking', 'Elevator Access'],
    community: 'Park Shore',
  },
  {
    code: 'C107', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Bay Colony Golf Condo',
    address: { street: '8073 Bay Colony Dr', city: 'Naples', state: 'FL', zipCode: '34108', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2450, rent: 9500, deposit: 9500,
    description: `Ultra-luxury living behind the exclusive gates of Bay Colony. This stunning 3-bed/3-bath condo sits within a premier private community inside Pelican Bay, offering Gulf views, two private beach clubs, and full Pelican Bay amenities. The residence features 10-foot ceilings, hardwood floors, a custom chef's kitchen, and three terraces. Concierge services, private dining, and valet parking complete the unparalleled luxury experience.`,
    amenities: ['Gulf View', 'Beachfront Access', 'Golf Access', 'Pool', 'Tennis Courts', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', 'Extended Lanai', 'Elevator Access', '2-Car Garage', 'Gated Community', 'Designer Furnishings', 'Smart Home'],
    community: 'Bay Colony',
  },
  {
    code: 'C108', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Tiburón Golf Club Condo',
    address: { street: '2870 Tiburon Blvd E', city: 'Naples', state: 'FL', zipCode: '34109', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1600, rent: 5400, deposit: 5400,
    description: `Spectacular golf course views from this beautifully appointed Tiburón condo overlooking the Greg Norman-designed championship course. The open-plan living area features impact-resistant sliding doors that open fully to a large screened lanai. Enjoy the community pool, fitness center, and close proximity to the Ritz-Carlton Golf Resort. The unit includes a full 2-car garage and all furnishings are high-end and designer-selected.`,
    amenities: ['Golf View', 'Golf Access', 'Pool', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', 'Extended Lanai', '2-Car Garage', 'Gated Community', 'Hurricane Windows', 'Designer Furnishings'],
    community: 'Tiburón',
  },
  {
    code: 'C109', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Mediterra Luxury Condo',
    address: { street: '16425 Carrara Way', city: 'Naples', state: 'FL', zipCode: '34110', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1850, rent: 6200, deposit: 6200,
    description: `Tuscany-inspired luxury in the world-renowned Mediterra community. This stunning condo features soaring ceilings, custom millwork, a gourmet kitchen with professional appliances, and a sprawling screened lanai with panoramic golf and preserve views. Mediterra residents enjoy two Tom Fazio golf courses, a 35,000 sf sports club, beach club on Bonita Beach, and fine dining. Truly resort-style living at its finest.`,
    amenities: ['Golf View', 'Preserve View', 'Golf Access', 'Pool', 'Tennis Courts', 'Fitness Center', 'Beachfront Access', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', 'Extended Lanai', '2-Car Garage', 'Gated Community', 'Designer Furnishings'],
    community: 'Mediterra',
  },
  {
    code: 'C110', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'North Naples Corner Condo',
    address: { street: '5765 Rattlesnake Hammock Rd', city: 'Naples', state: 'FL', zipCode: '34113', country: 'United States' },
    bedrooms: 1, bathrooms: 1, sqft: 900, rent: 2400, deposit: 2400,
    description: `Bright and cheerful corner unit in a well-maintained North Naples community. This 1-bed/1-bath condo offers an updated kitchen, tile throughout the living areas, and a cozy screened balcony. The community pool is heated year-round, and the location is superb — close to Publix, restaurants, and just 15 minutes to the beach. Perfect for a seasonal getaway or long-term rental. Assigned parking and storage unit included.`,
    amenities: ['Pool', 'Air Conditioning', 'WiFi', 'Kitchen', 'In-Unit Laundry', 'Lanai', 'Parking'],
    community: 'North Naples',
  },
  {
    code: 'C111', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Downtown Naples Urban Condo',
    address: { street: '990 10th Ave S', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1150, rent: 4400, deposit: 4400,
    description: `Walk to everything from this stylish downtown Naples condo. Situated just two blocks from Fifth Avenue South, the unit features contemporary finishes, an open-concept layout, and a private courtyard terrace. The kitchen was fully renovated with waterfall quartz island and Samsung appliances. Enjoy world-class dining, art galleries, Tin City, and Naples Pier all within walking distance. A rare opportunity to live in the heart of Old Naples.`,
    amenities: ['Pool', 'Air Conditioning', 'WiFi', 'Designer Kitchen', 'Washer/Dryer', 'Private Patio', 'Parking', 'Pet Friendly'],
    community: 'Downtown Naples',
  },
  {
    code: 'C112', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Quail West Premier Condo',
    address: { street: '4851 Bonita Beach Rd', city: 'Bonita Springs', state: 'FL', zipCode: '34134', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2600, rent: 8200, deposit: 8200,
    description: `Grand first-floor coach home in the prestigious Quail West community. This spectacular 3-bed/3-bath residence lives like a single-family home with a private 2-car garage and a massive wrap-around screened lanai overlooking the 4th hole of the Signature Course. The chef's kitchen features two islands, Wolf and Sub-Zero appliances, and a butler's pantry. Quail West amenities include two golf courses, a 100,000 sf clubhouse, spa, and tennis.`,
    amenities: ['Golf View', 'Golf Access', 'Pool', 'Tennis Courts', 'Fitness Center', 'Spa/Hot Tub', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', 'Extended Lanai', '2-Car Garage', 'Gated Community', 'Designer Furnishings', 'Premium Upgrades'],
    community: 'Quail West',
  },
  {
    code: 'C113', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Imperial Golf Condo',
    address: { street: '1705 Imperial Golf Course Blvd', city: 'Naples', state: 'FL', zipCode: '34110', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1400, rent: 3600, deposit: 3600,
    description: `Charming condo in the established Imperial Golf Estates community. This corner unit features updated bathrooms, tile flooring throughout, and a screened lanai with golf course views. Imperial Golf is a fully mature community with a beautiful 18-hole executive golf course, clubhouse, and active social calendar. Convenient to Whole Foods, Mercato shopping, and the beautiful beaches of North Naples.`,
    amenities: ['Golf View', 'Golf Access', 'Pool', 'Air Conditioning', 'WiFi', 'Kitchen', 'Washer/Dryer', 'Lanai', 'Parking', 'Gated Community'],
    community: 'Imperial Golf',
  },
  {
    code: 'C114', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Bonita Beach Condo',
    address: { street: '27001 Perdido Beach Blvd', city: 'Bonita Springs', state: 'FL', zipCode: '34135', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1100, rent: 4200, deposit: 4200,
    description: `Direct beachfront condo on the sugar-white sands of Bonita Beach. Wake up to the sound of the waves from this bright 2-bed/2-bath unit with a full Gulf-facing balcony. Updated kitchen and bathrooms, new furnishings, and all beach gear provided. The building features a beachfront pool, grilling area, and covered parking. Just a short drive to Coconut Point Mall, fine dining, and the Naples Botanical Garden.`,
    amenities: ['Gulf View', 'Beachfront Access', 'Pool', 'BBQ Grill', 'Air Conditioning', 'WiFi', 'Full Kitchen', 'In-Unit Laundry', 'Lanai', 'Parking'],
    community: 'Bonita Beach',
  },
  {
    code: 'C115', type: 'condo' as const, imgKey: 'condo_exterior' as ImgCategory,
    name: 'Marco Island Beachfront Condo',
    address: { street: '960 Cape Marco Dr', city: 'Marco Island', state: 'FL', zipCode: '34145', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2100, rent: 8800, deposit: 8800,
    description: `Spectacular Cape Marco high-rise condo offering unobstructed Gulf and beach views from every room. This 3-bed/3-bath residence features a custom kitchen, two master suites, and a massive terrace that spans the full width of the unit. Cape Marco is Marco Island's premier address with resort pools, tennis, fitness center, and a private beach boardwalk. Elegantly furnished and turnkey — just arrive and enjoy the magic of Marco Island.`,
    amenities: ['Gulf View', 'Beachfront Access', 'Pool', 'Tennis Courts', 'Fitness Center', 'Spa/Hot Tub', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', 'Extended Lanai', '2-Car Garage', 'Gated Community', 'Designer Furnishings', 'Hurricane Windows'],
    community: 'Cape Marco',
  },

  // ─────────── HOUSES (10) ───────────
  {
    code: 'H201', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Aqualane Shores Waterfront Home',
    address: { street: '630 Banyan Blvd', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
    bedrooms: 4, bathrooms: 4, sqft: 3800, rent: 18000, deposit: 18000,
    description: `Extraordinary waterfront estate in prestigious Aqualane Shores, one of the most coveted addresses in all of Naples. This 4-bed/4-bath custom home sits on a deep-water canal with direct Gulf access and a private dock for your boat. Features include a grand great room with soaring ceilings, gourmet chef's kitchen, primary suite with spa bath and dual closets, and a resort-style outdoor entertaining area with pool, spa, and summer kitchen. Walk to Fifth Avenue South and the beach.`,
    amenities: ['Bay View', 'Boat Dock', 'Beachfront Access', 'Private Pool', 'Spa/Hot Tub', 'Outdoor Kitchen', 'BBQ Grill', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', '2-Car Garage', 'Security System', 'Hurricane Windows', 'Smart Home'],
    community: 'Aqualane Shores',
  },
  {
    code: 'H202', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Port Royal Estate',
    address: { street: '4175 Gordon Dr', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
    bedrooms: 5, bathrooms: 6, sqft: 6200, rent: 35000, deposit: 35000,
    description: `Welcome to one of Naples' most iconic addresses — Port Royal. This magnificent 5-bed/6-bath estate commands sweeping views of Gordons Pass and the Gulf of Mexico. Every detail of this architectural masterpiece has been curated for the most discerning buyer: Wolf and Sub-Zero kitchens, Lutron smart home systems, a 4-car garage, wine cellar, home theater, and a resort-style pool terrace with 130 feet of prime waterfront. An extraordinary opportunity to lease a true Naples trophy home.`,
    amenities: ['Gulf View', 'Bay View', 'Boat Dock', 'Beachfront Access', 'Private Pool', 'Spa/Hot Tub', 'Outdoor Kitchen', 'BBQ Grill', 'Fire Pit', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', '2-Car Garage', 'Gated Community', 'Security System', 'Hurricane Windows', 'Smart Home', 'Designer Furnishings'],
    community: 'Port Royal',
  },
  {
    code: 'H203', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Coquina Sands Pool Home',
    address: { street: '1300 Sandpiper St', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2400, rent: 10500, deposit: 10500,
    description: `Classic Naples home in the highly sought-after Coquina Sands neighborhood. This 3-bed/3-bath home was completely renovated in 2021 with a new kitchen, updated baths, and new flooring throughout. The outdoor living area is exceptional — a screened pool/spa enclosure with covered lanai, built-in grill, and tropical landscaping. Walk to Lowdermilk Park Beach, the Baker Museum, and Waterside Shops. Deeded beach access included.`,
    amenities: ['Beachfront Access', 'Private Pool', 'Spa/Hot Tub', 'BBQ Grill', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', 'Garage', 'Security System', 'Hurricane Windows', 'Pet Friendly'],
    community: 'Coquina Sands',
  },
  {
    code: 'H204', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Old Naples Historic Home',
    address: { street: '255 3rd St S', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
    bedrooms: 4, bathrooms: 3, sqft: 2800, rent: 12500, deposit: 12500,
    description: `Timeless Old Florida charm in the heart of historic Old Naples. This lovingly restored 4-bed/3-bath cottage exudes character with original Dade County pine floors, shiplap walls, a wrap-around porch, and a beautifully landscaped private courtyard with pool. The updated kitchen is bright and functional. Located in the Third Street South district, you're steps from boutiques, Saturday farmers market, and world-class restaurants.`,
    amenities: ['Beachfront Access', 'Private Pool', 'Private Patio', 'BBQ Grill', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', 'Garage', 'Pet Friendly', 'Smart Home'],
    community: 'Old Naples',
  },
  {
    code: 'H205', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Grey Oaks Golf Estate',
    address: { street: '2427 Grey Oaks Dr N', city: 'Naples', state: 'FL', zipCode: '34105', country: 'United States' },
    bedrooms: 4, bathrooms: 4, sqft: 4200, rent: 16000, deposit: 16000,
    description: `Magnificent custom estate in the elite Grey Oaks community, one of only a handful of country clubs in Florida with three championship golf courses. This 4-bed/4-bath masterpiece sits on a prime lake and golf lot, offering panoramic views from every room. The gourmet kitchen opens to a vast great room and outdoor living area with a resort pool. The Grey Oaks Country Club features extensive dining, spa, tennis, fitness, and social programming year-round.`,
    amenities: ['Golf View', 'Lake View', 'Golf Access', 'Pool', 'Spa/Hot Tub', 'Tennis Courts', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', '2-Car Garage', 'Gated Community', 'Security System', 'Hurricane Windows', 'Smart Home', 'Outdoor Kitchen'],
    community: 'Grey Oaks',
  },
  {
    code: 'H206', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Quail West Luxury Estate',
    address: { street: '5265 Harrington Lake Dr N', city: 'Naples', state: 'FL', zipCode: '34119', country: 'United States' },
    bedrooms: 5, bathrooms: 5, sqft: 5500, rent: 22000, deposit: 22000,
    description: `Grand estate living in Quail West, consistently rated among Florida's finest private golf communities. This extraordinary 5-bed/5-bath home was custom built by a local luxury builder with no expense spared. Features include a wine room, home office, theater room, private gym, and a spectacular outdoor living complex with summer kitchen, fire features, and a large pool overlooking the golf course. The Quail West clubhouse, spa, and beach club complete the luxury lifestyle.`,
    amenities: ['Golf View', 'Golf Access', 'Private Pool', 'Spa/Hot Tub', 'Outdoor Kitchen', 'BBQ Grill', 'Fire Pit', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', '2-Car Garage', 'Gated Community', 'Security System', 'Hurricane Windows', 'Smart Home', 'Tennis Courts', 'Fitness Center'],
    community: 'Quail West',
  },
  {
    code: 'H207', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Twin Eagles Family Home',
    address: { street: '11217 Twin Eagles Blvd', city: 'Naples', state: 'FL', zipCode: '34120', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2650, rent: 8500, deposit: 8500,
    description: `Gorgeous lake-view home in the award-winning Twin Eagles community in North Naples. This 3-bed/3-bath home features a split floor plan, volume ceilings, a gourmet kitchen, and a screened pool/lanai with stunning lake and golf views. Twin Eagles offers an active social community with golf, tennis, pickleball, bocce, fitness, and resort pools. The home is fully furnished and ready for seasonal or annual occupancy.`,
    amenities: ['Lake View', 'Golf View', 'Golf Access', 'Private Pool', 'Tennis Courts', 'Fitness Center', 'Bocce Ball', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', '2-Car Garage', 'Gated Community', 'Hurricane Windows'],
    community: 'Twin Eagles',
  },
  {
    code: 'H208', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Ave Maria New Construction Home',
    address: { street: '5233 Salerno St', city: 'Ave Maria', state: 'FL', zipCode: '34142', country: 'United States' },
    bedrooms: 4, bathrooms: 3, sqft: 2900, rent: 5800, deposit: 5800,
    description: `Brand new construction in the vibrant master-planned community of Ave Maria. This 4-bed/3-bath home features an open-concept great room design, modern kitchen with quartz counters and gas range, a spacious lanai, and a 3-car garage. Ave Maria offers resort amenities including waterpark, golf, town center shops and dining, and a strong sense of community. Ideal for families looking for spacious, modern living at exceptional value.`,
    amenities: ['Pool', 'Golf Access', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', '2-Car Garage', 'Lanai', 'Pet Friendly'],
    community: 'Ave Maria',
  },
  {
    code: 'H209', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Cape Coral Waterfront Home',
    address: { street: '1424 SW 57th St', city: 'Cape Coral', state: 'FL', zipCode: '33914', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2200, rent: 7800, deposit: 7800,
    description: `Stunning Gulf access waterfront home in Southwest Cape Coral with your own private boat dock and lift. This 3-bed/3-bath home was thoughtfully renovated throughout with a new kitchen, updated bathrooms, and a screened pool with extended lanai. The oversized lot offers 100 feet of seawall and direct deep-water access to the Gulf — perfect for boating and fishing enthusiasts. Just 15 minutes by boat to Matlacha Pass and the Gulf islands.`,
    amenities: ['Bay View', 'Boat Dock', 'Private Pool', 'Spa/Hot Tub', 'BBQ Grill', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', '2-Car Garage', 'Hurricane Windows', 'Pet Friendly'],
    community: 'Cape Coral SW',
  },
  {
    code: 'H210', type: 'house' as const, imgKey: 'house_exterior' as ImgCategory,
    name: 'Bonita Springs Pool Home',
    address: { street: '9011 Colby Dr', city: 'Bonita Springs', state: 'FL', zipCode: '34135', country: 'United States' },
    bedrooms: 3, bathrooms: 2, sqft: 1900, rent: 5200, deposit: 5200,
    description: `Delightful pool home in a quiet Bonita Springs neighborhood, perfectly positioned between Naples and Fort Myers. This 3-bed/2-bath home features a split floor plan, updated kitchen and baths, tile floors throughout, and a spacious screened pool enclosure with covered lanai. The large fenced backyard is ideal for pets and outdoor entertaining. Within minutes of Coconut Point Mall, Barefoot Beach, and the best restaurants in Southwest Florida.`,
    amenities: ['Private Pool', 'BBQ Grill', 'Air Conditioning', 'WiFi', 'Kitchen', 'In-Unit Laundry', 'Garage', 'Pet Friendly'],
    community: 'Bonita Springs',
  },

  // ─────────── VILLAS / TOWNHOUSES (7) ───────────
  {
    code: 'V301', type: 'villa' as const, imgKey: 'villa_exterior' as ImgCategory,
    name: "Fiddler's Creek Golf Villa",
    address: { street: '8990 Salato Way', city: 'Naples', state: 'FL', zipCode: '34114', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1700, rent: 5800, deposit: 5800,
    description: `Elegant attached villa in the award-winning Fiddler's Creek community. This 2-bed/2-bath plus den residence features a private pool, extended screened lanai, and sweeping golf course views. The thoughtfully designed kitchen with granite counters and stainless appliances opens seamlessly to the great room and outdoor living space. Fiddler's Creek amenities include golf, multiple resort pools, spa, fitness center, pickleball, tennis, and a vibrant social club.`,
    amenities: ['Golf View', 'Golf Access', 'Private Pool', 'Spa/Hot Tub', 'Pool', 'Tennis Courts', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', 'Extended Lanai', '2-Car Garage', 'Gated Community', 'Pet Friendly'],
    community: "Fiddler's Creek",
  },
  {
    code: 'V302', type: 'villa' as const, imgKey: 'villa_exterior' as ImgCategory,
    name: 'Lely Resort Vacation Villa',
    address: { street: '7926 Valencia Ct', city: 'Naples', state: 'FL', zipCode: '34113', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2300, rent: 7200, deposit: 7200,
    description: `Spacious villa in Lely Resort offering access to The Players Club & Spa, one of the finest country club facilities in all of Florida. This 3-bed/3-bath attached villa features a private pool and spa, outdoor kitchen, and a large screened lanai with lake views. The interior boasts volume ceilings, a gourmet kitchen, hardwood floors, and three generous bedroom suites. Access to three championship golf courses makes this the ideal golf vacation rental.`,
    amenities: ['Lake View', 'Golf Access', 'Private Pool', 'Spa/Hot Tub', 'Outdoor Kitchen', 'Pool', 'Tennis Courts', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', 'Extended Lanai', '2-Car Garage', 'Gated Community', 'Designer Furnishings'],
    community: 'Lely Resort',
  },
  {
    code: 'V303', type: 'villa' as const, imgKey: 'villa_exterior' as ImgCategory,
    name: 'Palmira Golf Villa',
    address: { street: '11820 Palmira Trace Ct', city: 'Bonita Springs', state: 'FL', zipCode: '34135', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1550, rent: 4800, deposit: 4800,
    description: `Lovely detached villa in the gated Palmira Golf & Country Club community in Bonita Springs. This 2-bed/2-bath plus den villa has a heated pool, new kitchen, and a screened lanai overlooking the 10th hole. Palmira offers an 18-hole Gordon Lewis championship course, a 70,000 sf clubhouse, resort amenities, and a very active social calendar. An exceptional value in one of Southwest Florida's finest golf communities.`,
    amenities: ['Golf View', 'Golf Access', 'Private Pool', 'Pool', 'Tennis Courts', 'Fitness Center', 'Bocce Ball', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', 'Lanai', '2-Car Garage', 'Gated Community'],
    community: 'Palmira',
  },
  {
    code: 'V304', type: 'villa' as const, imgKey: 'villa_exterior' as ImgCategory,
    name: 'Imperial Golf Villas',
    address: { street: '2300 Carriage Rd', city: 'Naples', state: 'FL', zipCode: '34110', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1400, rent: 3900, deposit: 3900,
    description: `Well-maintained attached villa in the quiet Imperial Golf Villas, perfectly located in North Naples. This 2-bed/2-bath villa offers a clean, updated interior with new kitchen appliances, refreshed baths, and a screened lanai with golf course views. The Imperial Golf community features an executive course, community pool, and tennis courts. Close to Whole Foods, movie theaters, and a quick drive to the Gulf beaches.`,
    amenities: ['Golf View', 'Golf Access', 'Pool', 'Tennis Courts', 'Air Conditioning', 'WiFi', 'Kitchen', 'Washer/Dryer', 'Lanai', 'Garage', 'Gated Community'],
    community: 'Imperial Golf',
  },
  {
    code: 'V305', type: 'villa' as const, imgKey: 'villa_exterior' as ImgCategory,
    name: 'Talis Park Luxury Villa',
    address: { street: '16420 Talis Park Dr', city: 'Naples', state: 'FL', zipCode: '34110', country: 'United States' },
    bedrooms: 3, bathrooms: 3, sqft: 2800, rent: 10500, deposit: 10500,
    description: `Ultra-luxurious villa in Talis Park, Naples' most forward-thinking luxury community. This stunning 3-bed/3-bath villa blends indoor and outdoor living with retractable glass walls, a private pool, and a summer kitchen. Designed by Denton House Design Studio, the interiors feature a curated collection of art, custom furnishings, and smart home automation throughout. Talis Park amenities include the acclaimed Vyne House clubhouse, Beach Club at Vanderbilt Beach, spa, fitness, and golf.`,
    amenities: ['Golf View', 'Gulf View', 'Golf Access', 'Beachfront Access', 'Private Pool', 'Spa/Hot Tub', 'Outdoor Kitchen', 'BBQ Grill', 'Pool', 'Tennis Courts', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Gourmet Kitchen', 'In-Unit Laundry', '2-Car Garage', 'Gated Community', 'Smart Home', 'Designer Furnishings'],
    community: 'Talis Park',
  },
  {
    code: 'V306', type: 'villa' as const, imgKey: 'villa_exterior' as ImgCategory,
    name: 'Hammock Bay Golf Villa',
    address: { street: '1020 Borghese Ln', city: 'Naples', state: 'FL', zipCode: '34114', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1600, rent: 5100, deposit: 5100,
    description: `Charming villa in Hammock Bay Golf & Country Club overlooking one of Marco Island's finest courses. This 2-bed/2-bath plus den villa features an updated kitchen, tile floors, and an oversized screened lanai with golf course and water views. Hammock Bay offers a full-service golf club, resort pool, fitness center, and is conveniently located between Naples and Marco Island. A fantastic choice for golfers and those seeking a quieter, gated lifestyle.`,
    amenities: ['Golf View', 'Golf Access', 'Pool', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', 'Extended Lanai', '2-Car Garage', 'Gated Community', 'Pet Friendly'],
    community: 'Hammock Bay',
  },
  {
    code: 'V307', type: 'villa' as const, imgKey: 'villa_exterior' as ImgCategory,
    name: 'Reflection Lakes Resort Villa',
    address: { street: '14731 Reflection Lakes Dr', city: 'Fort Myers', state: 'FL', zipCode: '33907', country: 'United States' },
    bedrooms: 2, bathrooms: 2, sqft: 1350, rent: 3200, deposit: 3200,
    description: `Affordable resort-style living in the beautifully landscaped Reflection Lakes community in Fort Myers. This 2-bed/2-bath villa has been freshly painted, features an updated kitchen, tile throughout, and a screened lanai with peaceful lake views. Reflection Lakes is a vibrant community offering resort pools, tennis, fitness center, and a very active community center with events year-round. Close to RSW airport, Bell Tower Shops, and Barbara B. Mann Theater.`,
    amenities: ['Lake View', 'Pool', 'Tennis Courts', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Kitchen', 'Washer/Dryer', 'Lanai', 'Garage', 'Gated Community', 'Pet Friendly'],
    community: 'Reflection Lakes',
  },

  // ─────────── APARTMENTS (3) ───────────
  {
    code: 'A401', type: 'apartment' as const, imgKey: 'apartment_exterior' as ImgCategory,
    name: 'Olde Naples Luxury Apartment',
    address: { street: '1040 6th Ave S', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
    bedrooms: 1, bathrooms: 1, sqft: 850, rent: 3200, deposit: 3200,
    description: `Stylish 1-bed/1-bath apartment in a boutique building just two blocks from Fifth Avenue South in historic Old Naples. The unit features high ceilings, hardwood floors, an updated kitchen with quartz counters, and a private balcony with tropical garden views. Building amenities include a resort pool and outdoor lounge area. Walk to world-class dining, galleries, the Naples Pier, and the white sand beach. Ideal for professionals or discerning seasonal renters.`,
    amenities: ['Pool', 'Air Conditioning', 'WiFi', 'Designer Kitchen', 'In-Unit Laundry', 'Lanai', 'Parking', 'Pet Friendly', 'Elevator Access'],
    community: 'Olde Naples',
  },
  {
    code: 'A402', type: 'apartment' as const, imgKey: 'apartment_exterior' as ImgCategory,
    name: 'Bayfront Gardens Studio',
    address: { street: '1350 5th Ave S', city: 'Naples', state: 'FL', zipCode: '34102', country: 'United States' },
    bedrooms: 0, bathrooms: 1, sqft: 520, rent: 1900, deposit: 1900,
    description: `Cozy and efficiently designed studio apartment at Bayfront on 5th, Naples' premier waterfront mixed-use development. The unit features an open layout with a fully equipped kitchenette, Murphy bed, and a private balcony overlooking the marina. The complex offers a marina, resort pool, gym, and multiple waterfront dining options all within steps. Perfect for a solo traveler, remote worker, or couple seeking an affordable foothold in the heart of Naples.`,
    amenities: ['Bay View', 'Pool', 'Fitness Center', 'Air Conditioning', 'WiFi', 'Full Kitchen', 'Lanai', 'Parking', 'Elevator Access'],
    community: 'Bayfront',
  },
  {
    code: 'A403', type: 'apartment' as const, imgKey: 'apartment_exterior' as ImgCategory,
    name: 'Naples Park Modern Apartment',
    address: { street: '762 104th Ave N', city: 'Naples', state: 'FL', zipCode: '34108', country: 'United States' },
    bedrooms: 2, bathrooms: 1, sqft: 1050, rent: 2600, deposit: 2600,
    description: `Updated 2-bed/1-bath apartment in the popular Naples Park neighborhood, less than one mile to Vanderbilt Beach. This ground-floor unit features an open living area, fully renovated kitchen with shaker cabinets and granite counters, tile throughout, and a private screened porch with lush garden views. Private laundry in unit and one covered parking space included. The Naples Park area offers a true neighborhood feel with a farmers market, coffee shops, and quick beach access.`,
    amenities: ['Pool', 'Air Conditioning', 'WiFi', 'Premium Kitchen', 'In-Unit Laundry', 'Private Patio', 'Parking', 'Pet Friendly'],
    community: 'Naples Park',
  },
];

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function propertyTypeValue(t: 'condo' | 'house' | 'villa' | 'apartment'): string {
  const map: Record<string, string> = {
    condo: 'condo',
    house: 'house',
    villa: 'townhouse',
    apartment: 'apartment',
  };
  return map[t] ?? 'condo';
}

function unitTypeValue(t: 'condo' | 'house' | 'villa' | 'apartment'): string {
  const map: Record<string, string> = {
    condo: 'apartment',
    house: 'loft',
    villa: 'penthouse',
    apartment: 'apartment',
  };
  return map[t] ?? 'apartment';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function getMongoUri(): string {
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/SmartStartPM';
  if (uri.includes('=') && !uri.startsWith('mongodb')) {
    uri = uri.substring(uri.indexOf('=') + 1).trim();
  }
  return uri;
}

async function seed35Properties() {
  const MONGODB_URI = getMongoUri();
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not defined in .env.local');

  console.log('🌴  SmartStartPM — 35 Properties Seed Script');
  console.log('=============================================\n');

  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 12000,
    socketTimeoutMS: 45000,
  });
  console.log('✅  Connected to MongoDB\n');

  // Find owner/admin users
  const ownerUser = await User.findOne({ email: 'owner@smartstart.us' });
  const adminUser = await User.findOne({ email: 'hi@smartstart.us' });
  if (!ownerUser && !adminUser) {
    throw new Error('No owner or admin found. Run: npm run seed:demo first.');
  }
  const ownerId = ownerUser?._id ?? adminUser?._id;
  const managerId = adminUser?._id ?? ownerUser?._id;
  console.log(`👤  Owner  : ${ownerUser?.email ?? adminUser?.email}`);
  console.log(`👤  Manager: ${adminUser?.email ?? ownerUser?.email}\n`);

  // Remove previously seeded SmartStart properties (identified by code prefix)
  const deleted = await Property.deleteMany({
    'units.unitNumber': { $regex: /^[ACHV]\d{3}$/ },
  });
  console.log(`🗑️   Removed ${deleted.deletedCount} existing seeded properties\n`);

  console.log('🏠  Creating 35 properties...\n');
  let created = 0;

  for (const p of PROPERTIES) {
    try {
      const imgs = buildImages(p.imgKey, 7);
      const hasPool = p.amenities.some(a => a.toLowerCase().includes('pool'));
      const hasGarage = p.amenities.some(a => a.toLowerCase().includes('garage'));
      const hasLaundry = p.amenities.some(a => a.toLowerCase().includes('laundry') || a === 'Washer/Dryer');
      const hasLanai = p.amenities.some(a => a.toLowerCase().includes('lanai') || a.toLowerCase().includes('patio'));

      const doc = new Property({
        name: p.name,
        type: propertyTypeValue(p.type),
        description: p.description,
        address: p.address,
        ownerId,
        managerId,
        status: 'available',
        isMultiUnit: false,
        totalUnits: 1,
        images: imgs,
        amenities: amenityList(p.amenities),
        yearBuilt: 2000 + Math.floor(Math.random() * 23),
        units: [{
          unitNumber: p.code,
          unitType: unitTypeValue(p.type),
          floor: p.type === 'house' || p.type === 'villa' ? 1 : Math.floor(Math.random() * 8) + 1,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          squareFootage: p.sqft,
          rentAmount: p.rent,
          securityDeposit: p.deposit,
          status: 'available',
          images: imgs,
          centralAir: true,
          dishwasher: true,
          inUnitLaundry: hasLaundry,
          balcony: hasLanai,
          parking: {
            included: true,
            spaces: hasGarage ? 2 : 1,
            type: hasGarage ? 'garage' : 'open',
          },
          appliances: {
            refrigerator: true,
            stove: true,
            oven: true,
            microwave: true,
            dishwasher: true,
            washer: hasLaundry,
            dryer: hasLaundry,
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

      await doc.save();
      created++;
      console.log(`   ✅  [${p.code}] ${p.name}`);
    } catch (err: any) {
      console.error(`   ❌  [${p.code}] ${p.name}: ${err.message}`);
    }
  }

  const condos   = PROPERTIES.filter(p => p.type === 'condo').length;
  const houses   = PROPERTIES.filter(p => p.type === 'house').length;
  const villas   = PROPERTIES.filter(p => p.type === 'villa').length;
  const apts     = PROPERTIES.filter(p => p.type === 'apartment').length;

  console.log('\n=============================================');
  console.log(`✅  Created ${created} / ${PROPERTIES.length} properties`);
  console.log(`    🏢  Condos    : ${condos}`);
  console.log(`    🏡  Houses    : ${houses}`);
  console.log(`    🏘️   Villas    : ${villas}`);
  console.log(`    🏬  Apartments: ${apts}`);
  console.log('\n🌴  Done! Properties are live in the database.');

  await mongoose.disconnect();
  process.exit(0);
}

seed35Properties().catch(err => {
  console.error('❌  Fatal:', err.message);
  process.exit(1);
});
