import https from 'https';
import http from 'http';
import { writeFileSync } from 'fs';
import mongoose from 'mongoose';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 20000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchUrl(new URL(res.headers.location, url).href));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractProperty(html, url, typeHint) {
  const titleRaw = html.match(/<title>([^<]+)<\/title>/)?.[1]?.replace('- VMS Florida Realty', '').trim() || '';
  const metaDesc = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
  const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1] || '';

  const bedsMatch = titleRaw.match(/(\d+)\s*BR/i) || html.match(/(\d)\s*(?:Bed|bedroom)/i);
  const bathsMatch = titleRaw.match(/(\d+)\s*BA/i) || html.match(/(\d)\s*(?:Bath|bathroom)/i);
  const beds = bedsMatch ? parseInt(bedsMatch[1]) : 2;
  const baths = bathsMatch ? parseInt(bathsMatch[1]) : 1;

  const codeMatch = titleRaw.match(/#([A-Z0-9]+)/);
  const slug = url.split('/').filter(Boolean).pop() || 'prop';
  const code = codeMatch?.[1] || slug.slice(0, 10).toUpperCase().replace(/-/g, '');

  const name = titleRaw
    .replace(/\s*-?\s*#[A-Z0-9]+\s*$/i, '')
    .replace(/\(\d+\s*BR\s*\/\s*\d+\s*BA\)/i, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Naples Property';

  const priceMatch = html.match(/listing_main_image_price[^>]*>[\s\S]*?USD\s*([\d,]+)/);
  const pricePerNight = priceMatch ? parseInt(priceMatch[1].replace(',', '')) : 150;
  const monthlyRent = pricePerNight * 30;

  const allImgs = [...html.matchAll(/https:\/\/vms-florida\.com\/wp-content\/uploads\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi)];
  const uniqueImgs = [...new Set(allImgs.map(m => m[0]))]
    .filter(img => !img.match(/-\d+x\d+\./i))
    .filter(img => !img.includes('site-icon') && !img.includes('favicon') && !img.includes('cropped'));

  let propType = 'condo';
  if (typeHint === 'house' || url.includes('house') || url.includes('-home-')) propType = 'house';
  else if (typeHint === 'villa' || url.includes('magnolia-cove') || url.includes('villa')) propType = 'villa';

  let neighborhood = 'Naples';
  if (url.includes('falling-waters') || url.includes('falling-water')) neighborhood = 'Falling Waters';
  else if (url.includes('naples-park')) neighborhood = 'Naples Park';
  else if (url.includes('winter-park') || url.includes('winterpark')) neighborhood = 'Winter Park';
  else if (url.includes('glen-eagle')) neighborhood = 'Glen Eagle';
  else if (url.includes('world-tennis')) neighborhood = 'World Tennis Club';
  else if (url.includes('royal-arms')) neighborhood = 'Royal Arms';
  else if (url.includes('moon-lake')) neighborhood = 'Moon Lake';
  else if (url.includes('whittenberg') || url.includes('whitten')) neighborhood = 'Villas of Whittenberg';

  let description = metaDesc;
  if (!description || description.length < 30) {
    description = `Beautiful ${propType} in ${neighborhood}, Naples, FL. ${beds} bedroom, ${baths} bathroom vacation rental.`;
  }

  return { name, description, propType, code, beds, baths, pricePerNight, monthlyRent, neighborhood, images: uniqueImgs, ogImage, url };
}

const PROPERTY_URLS = [
  { url: 'https://vms-florida.com/properties/arctic-circle-condo-winter-park-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/cascades-condo-falling-water-02/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/cascades-condo-falling-waters-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/cascades-condo-falling-waters-03/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/frosty-way-condo-winterpark-2br-2-ba-900/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/georgetown-blvd-condo-royal-arms-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/jasmine-court-condo-falling-waters-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/jasmine-court-condo-falling-waters-02/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/jasmine-court-condo-falling-waters-03/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/jasmine-court-condo-falling-waters-04/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/magnolia-falls-condo-falling-waters-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/magnolia-falls-condo-falling-waters-02/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/modern-2-bed-2-bathroom-lakeview-condo/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/northwinds-drive-condo-winter-park-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/olympic-drive-condo-world-tennis-club-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/olympic-drive-condo-world-tennis-club-02/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/orchid-falls-condo-falling-waters-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/orchid-falls-condo-falling-waters-02/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/orchid-falls-condo-falling-waters-03/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/orchid-falls-condo-falling-waters-04/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/orchid-falls-condo-falling-waters-05/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/orchid-falls-condo-falling-waters-06/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/rosewood-condo-falling-waters-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/rosewood-condo-falling-waters-02/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/rosewood-condo-falling-waters-03/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/snowflake-lane-condo-winter-park-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/water-crest-condo-falling-waters-01/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/woodlands-condo-world-tennis-club/', type: 'condo' },
  { url: 'https://vms-florida.com/properties/harwich-court-pool-home-glen-eagle/', type: 'house' },
  { url: 'https://vms-florida.com/properties/moon-lake-house/', type: 'house' },
  { url: 'https://vms-florida.com/properties/naples-park-pool-house-01/', type: 'house' },
  { url: 'https://vms-florida.com/properties/whitten-drive-house-villas-of-whittenberg/', type: 'house' },
  { url: 'https://vms-florida.com/properties/magnolia-cove-falling-waters/', type: 'villa' },
];

async function run() {
  let uri = process.env.MONGODB_URI || '';
  if (uri.includes('=') && !uri.startsWith('mongodb')) uri = uri.substring(uri.indexOf('=')+1).trim();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');

  const properties = [];
  for (let i = 0; i < PROPERTY_URLS.length; i++) {
    const { url, type } = PROPERTY_URLS[i];
    const slug = url.split('/').filter(Boolean).pop();
    try {
      process.stdout.write(`[${i+1}/${PROPERTY_URLS.length}] ${slug}... `);
      const html = await fetchUrl(url);
      const prop = extractProperty(html, url, type);
      properties.push(prop);
      console.log(`OK: "${prop.name}" | ${prop.beds}BR ${prop.baths}BA | $${prop.pricePerNight}/night | ${prop.images.length} imgs`);
      await new Promise(r => setTimeout(r, 600));
    } catch(e) {
      console.log(`ERROR: ${e.message}`);
    }
  }

  writeFileSync('/tmp/vms-properties.json', JSON.stringify(properties, null, 2));
  console.log(`\nScraped ${properties.length} properties`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
