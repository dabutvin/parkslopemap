/**
 * Validates `src/data/places.geojson` against `PlaceProperties` and the
 * `BUILDINGS` registry. Run via `npm run typecheck`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDINGS } from "../src/lib/buildings";
import { validatePlaces } from "../src/lib/places";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const placesPath = join(root, "src", "data", "places.geojson");
const publicDir = join(root, "public");

const places = JSON.parse(readFileSync(placesPath, "utf8"));
const issues = validatePlaces(places);

for (const feature of places.features ?? []) {
  const photo = feature.properties?.photo;
  if (typeof photo === "string" && photo.startsWith("/")) {
    const photoPath = join(publicDir, photo.slice(1));
    if (!existsSync(photoPath)) {
      issues.push({
        index: places.features.indexOf(feature),
        id: feature.properties?.id,
        message: `photo file not found: ${photo} (expected ${photoPath})`,
      });
    }
  }
}

for (const [key, builder] of Object.entries(BUILDINGS)) {
  try {
    const drawing = builder();
    for (const field of ["width", "height", "anchorX", "anchorY", "scale"] as const) {
      if (!Number.isFinite(drawing[field])) {
        issues.push({
          index: -1,
          message: `BUILDINGS['${key}'] returned invalid ${field}`,
        });
      }
    }
    if (!Array.isArray(drawing.parts) || drawing.parts.length === 0) {
      issues.push({
        index: -1,
        message: `BUILDINGS['${key}'] must return at least one part`,
      });
    }
  } catch (error) {
    issues.push({
      index: -1,
      message: `BUILDINGS['${key}'] threw: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

if (issues.length > 0) {
  console.error("places.geojson validation failed:\n");
  for (const issue of issues) {
    const prefix =
      issue.index >= 0
        ? `  feature[${issue.index}]${issue.id ? ` (${issue.id})` : ""}`
        : "  registry";
    console.error(`${prefix}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(`places.geojson OK (${places.features.length} POIs, ${Object.keys(BUILDINGS).length} buildings)`);
