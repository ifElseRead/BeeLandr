import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { faker } from "@faker-js/faker";

faker.locale = "en_GB";

// ⚡ Define __dirname first
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the offline UK cities
const ukCitiesPath = path.join(__dirname, "ukCities.json");
const ukCities = JSON.parse(fs.readFileSync(ukCitiesPath, "utf8"));

function generateListing(id) {
  const city = faker.helpers.arrayElement(ukCities);
  const hasPolygon = Math.random() > 0.5;

  const baseLat = city.lat;
  const baseLng = city.lng;

  const listing = {
    id,
    locationName: city.name,
    ownerName: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number("+44 7#########"),
    landSize: faker.number.float({ min: 1.5, max: 5.5, precision: 0.1 }),
    landType: faker.helpers.arrayElement([
      "Wildflower Meadow",
      "Orchard",
      "Farmland",
      "Woodland",
      "Vineyard",
      "Garden",
      "Park",
      "Pasture",
    ]),
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
  console.log("🌾 Generating 500 UK land listings...");

  const listings = Array.from({ length: 500 }, (_, i) =>
    generateListing(i + 1),
  );

  const outputPath = path.join(__dirname, "landData.json");
  fs.writeFileSync(outputPath, JSON.stringify(listings, null, 2), "utf8");

  console.log("✅ Done!");
  console.log(`📁 File created: ${outputPath}`);
}

run();
