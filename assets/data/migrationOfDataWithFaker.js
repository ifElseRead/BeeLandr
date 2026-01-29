import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fakerEN_GB as faker } from "@faker-js/faker";

// ⚡ Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the offline UK cities
const ukCitiesPath = path.join(__dirname, "ukCities.json");
const ukCities = JSON.parse(fs.readFileSync(ukCitiesPath, "utf8"));

const LAND_TYPES = [
  "Wildflower Meadow",
  "Orchard",
  "Farmland",
  "Woodland",
  "Vineyard",
  "Garden",
  "Park",
  "Pasture",
];

function generateListing(id, forcedType = null) {
  const city = faker.helpers.arrayElement(ukCities);
  const hasPolygon = Math.random() > 0.5;

  const baseLat = city.lat;
  const baseLng = city.lng;

  const landType = forcedType || faker.helpers.arrayElement(LAND_TYPES);

  // 1. Generate a random land size (1.5 to 15.0 acres for more variety)
  const landSize = faker.number.float({
    min: 1.5,
    max: 15.0,
    fractionDigits: 1,
  });

  // 2. Calculate hive capacity based on size (roughly 2-3 hives per acre)
  // We add a little randomness so it's not a perfect mathematical ratio
  const hiveCapacity = Math.floor(
    landSize * faker.number.float({ min: 1.8, max: 3.2, fractionDigits: 1 }),
  );

  const listing = {
    id,
    locationName: city.name,
    ownerName: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number("+44 7#########"),
    landSize: `${landSize} acres`, // Stored as a string for easy display
    hives: hiveCapacity, // The key you need for your beekeeper filters
    landType: landType,
    description: `${faker.helpers.arrayElement([
      "Perfect for beekeeping",
      "Great water access",
      "Ideal for hobby farming",
      "Excellent soil quality",
      "Quiet and scenic",
    ])} near ${city.name}`,
    suitability: faker.number.int({ min: 6, max: 10 }),
    status: "Available",
  };

  if (hasPolygon) {
    const offset = 0.004;
    listing.type = "polygon";
    listing.coordinates = [
      [baseLat, baseLng],
      [baseLat + offset, baseLng],
      [baseLat + offset, baseLng + offset],
      [baseLat, baseLng + offset],
      [baseLat, baseLng],
    ];
  } else {
    listing.lat = baseLat;
    listing.lng = baseLng;
  }

  return listing;
}

function run() {
  const totalCount = 500;
  console.log(
    `🐝 Generating ${totalCount} UK land listings with hive capacities...`,
  );

  const listings = [];

  LAND_TYPES.forEach((type, index) => {
    listings.push(generateListing(index + 1, type));
  });

  const remainingCount = totalCount - LAND_TYPES.length;
  for (let i = 0; i < remainingCount; i++) {
    listings.push(generateListing(listings.length + 1));
  }

  const shuffledListings = faker.helpers.shuffle(listings);

  const outputPath = path.join(__dirname, "landData.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(shuffledListings, null, 2),
    "utf8",
  );

  console.log("✅ Done!");
  console.log(`📁 File created: ${outputPath}`);
}

run();
