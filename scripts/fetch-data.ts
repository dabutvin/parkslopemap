/**
 * Fetches the raw geographic data that the map is drawn from and writes it as
 * static GeoJSON into src/data. Run on demand with `npm run fetch-data`; it is
 * NOT part of the app runtime (the app only reads the committed GeoJSON).
 *
 * It produces five files:
 *   - park-slope-boundary.geojson : the neighborhood outline
 *   - prospect-park.geojson       : the park polygon (the eastern landmark)
 *   - washington-park.geojson     : the labeled inner green (Old Stone House)
 *   - green-spaces.geojson        : smaller, unlabeled inner playgrounds
 *   - streets.geojson             : the avenue + cross-street grid
 *
 * The boundary is stitched from real OpenStreetMap geometry so the borders are
 * accurate: the four bounding streets (Fourth Ave, Flatbush Ave, Prospect
 * Expressway, Prospect Park West) are intersected to find the corners, and the
 * eastern edge follows Prospect Park's actual western boundary.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import osmtogeojson from "osmtogeojson";
import {
  lineIntersect,
  nearestPointOnLine,
  distance,
  multiLineString,
  featureCollection,
  booleanIntersects,
  booleanPointInPolygon,
  centroid,
  rewind,
} from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
  Position,
} from "geojson";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data");

// Generous bounding box around Park Slope (south, west, north, east).
const BBOX = { s: 40.6575, w: -73.9935, n: 40.6845, e: -73.968 };

// Streets that form the colloquial borders, in clockwise order.
const BORDER_STREETS = {
  west: "4th Avenue",
  north: "Flatbush Avenue",
  east: "Prospect Park West",
  south: "Prospect Expressway",
};

// Approximate corner locations [lon, lat], used to disambiguate when two streets
// cross at more than one place (e.g. expressway interchanges).
const EXPECTED_CORNERS = {
  nw: [-73.9783, 40.6817] as Position, // Fourth Ave x Flatbush Ave
  ne: [-73.9701, 40.6726] as Position, // Flatbush Ave x Prospect Park West (Grand Army Plaza)
  se: [-73.98, 40.6606] as Position, // Prospect Park West x Prospect Expressway (Bartel-Pritchard Sq)
  sw: [-73.9905, 40.663] as Position, // Prospect Expressway x Fourth Ave
};

// Corners of the Washington Park superblock (4th/5th Aves x 3rd/5th Streets),
// used to disambiguate the street crossings.
const WASHINGTON_CORNERS = {
  nw: [-73.9857, 40.674] as Position, // 4th Ave x 3rd Street
  ne: [-73.9833, 40.6728] as Position, // 5th Ave x 3rd Street
  se: [-73.9843, 40.6716] as Position, // 5th Ave x 5th Street
  sw: [-73.9867, 40.6728] as Position, // 4th Ave x 5th Street
};

// The avenues that read as the neighborhood's "spine".
const AVENUES = new Set([
  "4th Avenue",
  "5th Avenue",
  "6th Avenue",
  "7th Avenue",
  "8th Avenue",
  "Prospect Park West",
]);

async function overpass(query: string): Promise<unknown> {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastErr: unknown;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "parkslope-map/0.1 (https://github.com/dabutvin/parkslope)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`Overpass endpoint failed (${url}):`, err);
      lastErr = err;
    }
  }
  throw lastErr;
}

/** Combine every fetched segment that shares a name into one MultiLineString. */
function streetByName(streets: FeatureCollection, name: string): Feature<MultiLineString> | null {
  const parts: Position[][] = [];
  for (const f of streets.features) {
    if (f.properties?.name !== name) continue;
    const g = f.geometry;
    if (g.type === "LineString") parts.push(g.coordinates);
    else if (g.type === "MultiLineString") parts.push(...g.coordinates);
  }
  return parts.length ? multiLineString(parts) : null;
}

/** Find where two streets cross, choosing the crossing nearest the expected corner. */
function corner(
  a: Feature<MultiLineString> | null,
  b: Feature<MultiLineString> | null,
  expected: Position
): Position {
  if (a && b) {
    const hits = lineIntersect(a, b).features;
    if (hits.length) {
      hits.sort(
        (p, q) =>
          distance(p.geometry.coordinates, expected) - distance(q.geometry.coordinates, expected)
      );
      return hits[0].geometry.coordinates;
    }
    // No clean crossing: fall back to the closest approach between the lines.
    let best: Position | null = null;
    let bestDist = Infinity;
    for (const line of a.geometry.coordinates) {
      for (const pt of line) {
        const snap = nearestPointOnLine(b, pt);
        const d = snap.properties.dist ?? Infinity;
        if (d < bestDist) {
          bestDist = d;
          best = pt;
        }
      }
    }
    if (best) return best;
  }
  console.warn("Falling back to expected corner for", expected);
  return expected;
}

function largestPolygonRing(geom: Polygon | MultiPolygon): Position[] {
  if (geom.type === "Polygon") return geom.coordinates[0];
  let ring = geom.coordinates[0][0];
  let max = 0;
  for (const poly of geom.coordinates) {
    const n = poly[0].length;
    if (n > max) {
      max = n;
      ring = poly[0];
    }
  }
  return ring;
}

/** Walk a polygon ring between the vertices nearest two points, keeping the western arc. */
function ringArc(ring: Position[], from: Position, to: Position): Position[] {
  const nearest = (p: Position) => {
    let idx = 0;
    let best = Infinity;
    ring.forEach((v, i) => {
      const d = distance(v, p);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
    return idx;
  };
  const i = nearest(from);
  const j = nearest(to);
  const forward: Position[] = [];
  for (let k = i; k !== j; k = (k + 1) % ring.length) forward.push(ring[k]);
  forward.push(ring[j]);
  const backward: Position[] = [];
  for (let k = i; k !== j; k = (k - 1 + ring.length) % ring.length) backward.push(ring[k]);
  backward.push(ring[j]);
  // Keep whichever arc is further west (smaller average longitude).
  const avgLon = (arc: Position[]) => arc.reduce((s, c) => s + c[0], 0) / arc.length;
  return avgLon(forward) <= avgLon(backward) ? forward : backward;
}

async function main() {
  console.log("Querying Overpass for streets and Prospect Park...");

  const streetsRaw = await overpass(`
    [out:json][timeout:90];
    (
      way["highway"]["name"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
    );
    out body; >; out skel qt;
  `);
  const streets = osmtogeojson(streetsRaw) as FeatureCollection;
  streets.features = streets.features.filter(
    (f) => f.geometry.type === "LineString" || f.geometry.type === "MultiLineString"
  );
  for (const f of streets.features) {
    f.properties = {
      name: f.properties?.name ?? null,
      kind: AVENUES.has(f.properties?.name) ? "avenue" : "street",
    };
  }
  console.log(`  fetched ${streets.features.length} street segments`);

  const parkRaw = await overpass(`
    [out:json][timeout:90];
    (
      relation["leisure"="park"]["name"="Prospect Park"](40.65,-74.0,40.68,-73.955);
      way["leisure"="park"]["name"="Prospect Park"](40.65,-74.0,40.68,-73.955);
    );
    out body; >; out skel qt;
  `);
  const parkFc = osmtogeojson(parkRaw) as FeatureCollection;
  const park = parkFc.features.find(
    (f) =>
      (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") &&
      f.properties?.name === "Prospect Park"
  ) as Feature<Polygon | MultiPolygon> | undefined;
  if (!park) throw new Error("Could not find Prospect Park polygon");
  park.properties = { name: "Prospect Park" };
  // Drop interior holes so the park reads as one clean green mass.
  if (park.geometry.type === "Polygon") {
    park.geometry.coordinates = [park.geometry.coordinates[0]];
  } else {
    park.geometry.coordinates = park.geometry.coordinates.map((poly) => [poly[0]]);
  }
  console.log("  fetched Prospect Park polygon");

  console.log("Stitching the neighborhood boundary from real street geometry...");
  const west = streetByName(streets, BORDER_STREETS.west);
  const north = streetByName(streets, BORDER_STREETS.north);
  const east = streetByName(streets, BORDER_STREETS.east);
  const south = streetByName(streets, BORDER_STREETS.south);

  const nw = corner(west, north, EXPECTED_CORNERS.nw);
  const ne = corner(north, east, EXPECTED_CORNERS.ne);
  const se = corner(east, south, EXPECTED_CORNERS.se);
  const sw = corner(south, west, EXPECTED_CORNERS.sw);

  // Washington Park (with J.J. Byrne Playground) reads as the whole superblock
  // from 4th to 5th Avenue between 3rd and 5th Streets — the playground entrance
  // sits right on 5th Avenue. Stitch it from the same street geometry as the
  // boundary so the green lines up with the drawn grid.
  const fifthAve = streetByName(streets, "5th Avenue");
  const thirdSt = streetByName(streets, "3rd Street");
  const fifthSt = streetByName(streets, "5th Street");
  const wpNW = corner(west, thirdSt, WASHINGTON_CORNERS.nw);
  const wpNE = corner(fifthAve, thirdSt, WASHINGTON_CORNERS.ne);
  const wpSE = corner(fifthAve, fifthSt, WASHINGTON_CORNERS.se);
  const wpSW = corner(west, fifthSt, WASHINGTON_CORNERS.sw);
  const washington: Feature<Polygon> = {
    type: "Feature",
    properties: { name: "Washington Park" },
    geometry: { type: "Polygon", coordinates: [[wpNW, wpNE, wpSE, wpSW, wpNW]] },
  };

  // Eastern edge follows the park's actual western boundary for accuracy.
  const ring = largestPolygonRing(park.geometry);
  const easternEdge = ringArc(ring, ne, se);

  const boundaryCoords: Position[] = [nw, ne, ...easternEdge, se, sw, nw];
  const boundary: Feature<Polygon> = {
    type: "Feature",
    properties: { name: "Park Slope" },
    geometry: { type: "Polygon", coordinates: [boundaryCoords] },
  };

  // Keep only the streets that actually fall within the neighborhood so the
  // runtime stays light; the app trims the ragged ends with an SVG clip.
  const before = streets.features.length;
  streets.features = streets.features.filter((f) => {
    try {
      return booleanIntersects(f, boundary);
    } catch {
      return false;
    }
  });
  console.log(`  trimmed streets to neighborhood: ${before} -> ${streets.features.length}`);

  // Smaller playgrounds scattered through the neighborhood become unlabeled
  // green dabs. Keep only those whose centroid lands inside the boundary, and
  // drop Washington Park's own J.J. Byrne Playground (already drawn as a park).
  console.log("Querying Overpass for inner playgrounds...");
  const playRaw = await overpass(`
    [out:json][timeout:90];
    (
      way["leisure"="playground"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
      relation["leisure"="playground"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});
    );
    out body; >; out skel qt;
  `);
  const playFc = osmtogeojson(playRaw) as FeatureCollection;
  const playgrounds = playFc.features.filter((f) => {
    if (f.geometry.type !== "Polygon" && f.geometry.type !== "MultiPolygon") return false;
    const name = (f.properties?.name as string | undefined) ?? "";
    if (/byrne|washington park/i.test(name)) return false;
    try {
      return booleanPointInPolygon(centroid(f as Feature<Polygon | MultiPolygon>), boundary);
    } catch {
      return false;
    }
  }) as Feature<Polygon | MultiPolygon>[];
  for (const f of playgrounds) f.properties = {}; // unlabeled
  console.log(`  kept ${playgrounds.length} inner playgrounds`);

  // d3-geo treats polygons as spherical and expects CLOCKWISE outer rings;
  // rings the other way are read as "the whole globe minus this shape". Rewind
  // so the app fills the actual interiors.
  const boundaryCW = rewind(boundary, { reverse: true }) as Feature<Polygon>;
  const parkCW = rewind(park, { reverse: true }) as Feature<Polygon | MultiPolygon>;
  const washingtonCW = rewind(washington, { reverse: true }) as Feature<Polygon | MultiPolygon>;
  const greenSpacesCW = featureCollection(
    playgrounds.map((f) => rewind(f, { reverse: true }) as Feature<Polygon | MultiPolygon>)
  );

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    join(OUT_DIR, "park-slope-boundary.geojson"),
    JSON.stringify(boundaryCW, null, 2)
  );
  await writeFile(
    join(OUT_DIR, "prospect-park.geojson"),
    JSON.stringify(parkCW, null, 2)
  );
  await writeFile(
    join(OUT_DIR, "washington-park.geojson"),
    JSON.stringify(washingtonCW, null, 2)
  );
  await writeFile(
    join(OUT_DIR, "green-spaces.geojson"),
    JSON.stringify(greenSpacesCW, null, 2)
  );
  await writeFile(
    join(OUT_DIR, "streets.geojson"),
    JSON.stringify(featureCollection(streets.features as Feature<LineString | MultiLineString>[]), null, 2)
  );

  console.log(`Done. Wrote 5 GeoJSON files to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
