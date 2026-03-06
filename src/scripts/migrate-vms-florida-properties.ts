/**
 * SmartStartPM - VMS Florida Property Migration Script
 * Scrapes https://vms-florida.com/advanced-search/ for all properties,
 * extracts images, addresses, and details, then creates or updates DB records.
 *
 * Usage: npm run migrate:vms
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import * as cheerio from "cheerio";
import Property from "../models/Property";
import User from "../models/User";

const VMS_BASE = "https://vms-florida.com";
const ADVANCED_SEARCH_URL = `${VMS_BASE}/advanced-search/`;

// Naples, FL zip codes by area (fallback when address not found)
const AREA_ZIP: Record<string, string> = {
  "falling waters": "34119",
  "world tennis club": "34105",
  "villas of whittenberg": "34109",
  "moon lake": "34109",
  "naples park": "34109",
  "glen eagle": "34119",
  "winter park": "34119",
  winterpark: "34119",
  "royal arms": "34119",
  "old naples": "34102",
};

function getZipForArea(area: string): string {
  const lower = area.toLowerCase();
  for (const [key, zip] of Object.entries(AREA_ZIP)) {
    if (lower.includes(key)) return zip;
  }
  return "34119"; // default Naples
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function getPropertyUrls(): Promise<string[]> {
  const html = await fetchHtml(ADVANCED_SEARCH_URL);
  const $ = cheerio.load(html);
  const urls: string[] = [];
  $('a[href*="/properties/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith("https://vms-florida.com/properties/")) {
      const clean = href.replace(/\/$/, "");
      if (!urls.includes(clean)) urls.push(clean);
    }
  });
  return urls;
}

interface ScrapedProperty {
  url: string;
  name: string;
  unitCode: string;
  type: "condo" | "house" | "villa";
  bedrooms: number;
  bathrooms: number;
  pricePerNight: number;
  description: string;
  area: string;
  city: string;
  images: string[];
}

function extractUnitCode(name: string): string {
  // e.g. "CASCADES Condo, Falling Waters (2 BR / 2 BA) – #C446" -> C446
  const match = name.match(/#\s*([A-Z]?\d+[A-Z]?)\s*$/i) || name.match(/–\s*([A-Z]?\d+[A-Z]?)\s*$/i);
  if (match) return match[1].toUpperCase();
  // Fallback: use first letters + numbers from name
  const codeMatch = name.match(/([CHV]\d+)/i);
  return codeMatch ? codeMatch[1].toUpperCase() : "";
}

async function scrapePropertyDetail(url: string): Promise<ScrapedProperty | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const h1 = $("h1").first().text().trim();
    if (!h1) return null;

    const name = h1;
    const unitCode = extractUnitCode(name);

    // Type: Condo, House, Villa
    let type: "condo" | "house" | "villa" = "condo";
    const typeText = $('a[href*="/listings/"]').first().text().toLowerCase();
    if (typeText.includes("house")) type = "house";
    else if (typeText.includes("villa")) type = "villa";

    // Bedrooms / Bathrooms from title or page
    let bedrooms = 2;
    let bathrooms = 2;
    const brMatch = name.match(/(\d+)\s*BR/i) || $("*").filter((_, el) => $(el).text().includes("Bedrooms")).first().text().match(/(\d+)/);
    const baMatch = name.match(/(\d+)\s*BA/i) || $("*").filter((_, el) => $(el).text().includes("Bathrooms")).first().text().match(/(\d+)/);
    if (brMatch) bedrooms = parseInt(brMatch[1], 10);
    if (baMatch) bathrooms = parseInt(baMatch[1], 10);

    // Price per night
    let pricePerNight = 100;
    const priceText = $("*").filter((_, el) => $(el).text().includes("Price per night")).first().text();
    const priceMatch = priceText.match(/USD\s*([\d.]+)/) || $("body").text().match(/Price per night:\s*USD\s*([\d.]+)/);
    if (priceMatch) pricePerNight = parseFloat(priceMatch[1]);

    // Description
    let description = "";
    const descEl = $(".property_description, .listing_detail, [class*='description']").first();
    if (descEl.length) {
      description = descEl.text().trim().slice(0, 1990);
    }
    if (!description) {
      const firstP = $("article p, .entry-content p").first().text().trim();
      if (firstP) description = firstP.slice(0, 1990);
    }

    // Area & City
    let area = "Naples";
    let city = "Naples";
    $('a[href*="/area/"]').each((_, el) => {
      const t = $(el).text().trim();
      if (t && !area.includes(t)) area = t;
    });
    $('a[href*="/city/"]').each((_, el) => {
      const t = $(el).text().trim();
      if (t) city = t;
    });

    // Images: from gallery links (data-fancybox) and img src
    const images: string[] = [];
    $('a[href*="wp-content/uploads"][data-fancybox="website_rental_gallery"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && !images.includes(href)) images.push(href);
    });
    $('img[src*="wp-content/uploads"]').each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.includes("/css-images/") && !src.includes("poi/") && !images.includes(src)) {
        images.push(src);
      }
    });

    return {
      url,
      name,
      unitCode,
      type,
      bedrooms,
      bathrooms,
      pricePerNight,
      description: description || `${name} - Vacation rental in ${area}, ${city}.`,
      area,
      city,
      images: images.slice(0, 15),
    };
  } catch (err) {
    console.error(`   ⚠️  Scrape failed for ${url}:`, (err as Error).message);
    return null;
  }
}

function getAmenityCategory(name: string): string {
  const map: Record<string, string> = {
    Pool: "Recreation",
    "Private Pool": "Recreation",
    "Tennis Courts": "Recreation",
    "Fitness Center": "Recreation",
    "Air Conditioning": "Climate",
    WiFi: "Utilities",
    Kitchen: "Kitchen",
    "Washer/Dryer": "Laundry",
    Parking: "Parking",
    Garage: "Parking",
    Lanai: "Outdoor",
    "Lake View": "Living",
    "BBQ Grill": "Outdoor",
    "Outdoor Kitchen": "Outdoor",
  };
  return map[name] || "Other";
}

function buildAddress(area: string, city: string): { street: string; city: string; state: string; zipCode: string; country: string } {
  const zip = getZipForArea(area);
  return {
    street: area || `${city} Area`,
    city,
    state: "FL",
    zipCode: zip,
    country: "USA",
  };
}

function mapPropertyType(type: "condo" | "house" | "villa"): "condo" | "house" | "townhouse" {
  if (type === "house") return "house";
  if (type === "villa") return "townhouse";
  return "condo";
}

async function migrate() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
  }

  console.log("🌴 VMS Florida Property Migration");
  console.log("================================\n");

  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  console.log("✅ Connected to MongoDB\n");

  const ownerUser = await User.findOne({ email: "owner@smartstart.us" });
  const adminUser = await User.findOne({ email: "hi@smartstart.us" });
  if (!ownerUser && !adminUser) {
    throw new Error("No owner or admin user found. Run seed:demo first.");
  }
  const ownerId = ownerUser?._id || adminUser?._id;
  const managerId = adminUser?._id;

  console.log("📥 Fetching property URLs from advanced search...");
  const urls = await getPropertyUrls();
  console.log(`   Found ${urls.length} properties\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    process.stdout.write(`   [${i + 1}/${urls.length}] ${url.split("/").pop()?.slice(0, 40)}... `);

    const scraped = await scrapePropertyDetail(url);
    if (!scraped) {
      console.log("⚠️  skipped (parse failed)");
      skipped++;
      continue;
    }

    const code = scraped.unitCode || `VMS-${i + 1}`;
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await Property.findOne({
      $or: [
        { "units.unitNumber": { $regex: escapeRegex(code), $options: "i" } },
        { name: { $regex: escapeRegex(scraped.name.slice(0, 40)), $options: "i" } },
      ],
    });

    const address = buildAddress(scraped.area, scraped.city);
    const propertyType = mapPropertyType(scraped.type);
    const unitType = scraped.type === "house" ? "loft" : scraped.type === "villa" ? "penthouse" : "apartment";
    const monthlyRent = Math.round(scraped.pricePerNight * 30);
    const defaultAmenities = ["Pool", "Air Conditioning", "WiFi", "Kitchen", "Lanai", "Parking"];

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (scraped.images.length > 0 && (!existing.images || existing.images.length === 0)) {
        updates.images = scraped.images;
      }
      if (scraped.description && (!existing.description || existing.description.length < 50)) {
        updates.description = scraped.description;
      }
      if (!existing.address?.street || existing.address.street === "TBD") {
        updates.address = address;
      }
      if (existing.units?.[0] && scraped.images.length > 0 && (!existing.units[0].images || existing.units[0].images!.length === 0)) {
        updates["units.0.images"] = scraped.images;
      }
      if (Object.keys(updates).length > 0) {
        await Property.updateOne({ _id: existing._id }, { $set: updates });
        console.log("✅ updated");
        updated++;
      } else {
        console.log("⏭️  no changes");
        skipped++;
      }
    } else {
      const property = new Property({
        name: scraped.name,
        type: propertyType,
        description: scraped.description,
        address,
        ownerId,
        managerId,
        status: "available",
        isMultiUnit: false,
        totalUnits: 1,
        images: scraped.images.length > 0 ? scraped.images : [
          `https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80`,
        ],
        amenities: defaultAmenities.map((name) => ({ name, category: getAmenityCategory(name) })),
        units: [
          {
            unitNumber: code,
            unitType,
            floor: 1,
            bedrooms: scraped.bedrooms,
            bathrooms: scraped.bathrooms,
            squareFootage: 1100 + scraped.bedrooms * 50,
            rentAmount: monthlyRent,
            securityDeposit: 500,
            status: "available",
            images: scraped.images.length > 0 ? scraped.images : [],
            centralAir: true,
            dishwasher: true,
            inUnitLaundry: true,
            balcony: true,
            parking: { included: true, spaces: 1, type: "open" },
            appliances: {
              refrigerator: true,
              stove: true,
              oven: true,
              microwave: true,
              dishwasher: true,
              washer: true,
              dryer: true,
            },
            utilities: {
              electricity: "tenant",
              water: "included",
              internet: "included",
              cable: "tenant",
              trash: "included",
            },
          },
        ],
      });
      await property.save();
      console.log("✅ created");
      created++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n=================================");
  console.log(`✅ Migration complete: ${created} created, ${updated} updated, ${skipped} skipped`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
