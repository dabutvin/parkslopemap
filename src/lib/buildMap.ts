import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
  Polygon,
  MultiPolygon,
} from "geojson";
import { createProjection, DEFAULT_ANGLE } from "./projection";
import { roughen, type RoughOptions, type RoughSubPath } from "./roughen";
import { BUILDINGS } from "./buildings";

// Hand-drawn palette: warm paper, sage park, soft ink.
export const COLORS = {
  paper: "#efe6d2",
  neighborhood: "#f7f0df",
  park: "#bcd1a6",
  parkInk: "#7d976a",
  ink: "#5b4a3a",
  avenue: "#8a7256",
  street: "#b7a78f",
  parkTrail: "#7d976a",
  parkDrive: "#6a8456",
  water: "#9ec7da",
  waterInk: "#5c869e",
};

// Roads (by OSM name) that belong to Grand Army Plaza. They're pulled out of the
// clipped street layer so the plaza can complete past the NE corner of the map.
const PLAZA_STREETS = new Set(["Grand Army Plaza", "Plaza Street West", "Plaza Street East"]);
// The two roads that actually trace the oval; an ellipse is fitted to them. The
// other plaza roads are connectors that would only clutter the shape.
const PLAZA_OVAL = new Set(["Plaza Street West", "Plaza Street East"]);

export interface AvenueLabel {
  name: string;
  x: number;
  y: number;
  angle: number;
  /** Zoom factor (model.width / viewBox.width) at which this label appears. */
  minZoom?: number;
}

/**
 * The "Prospect Park" label. Unlike the avenue labels it is *clickable* (it has
 * no building drawing of its own), so it carries the same detail-drawer fields a
 * POI does, keyed by `id`.
 */
export interface ParkLabel extends AvenueLabel {
  id: string;
  category: string;
  description: string;
  photo?: string;
  photoAlt?: string;
  photoCredit?: string;
}

export interface KeyedSubPath extends RoughSubPath {
  key: string;
}

/**
 * A point of interest drawn as a hand-drawn building. `parts` are roughened and
 * expressed in the building's *local* coordinates; the renderer places them on
 * the map with `translate(x, y) scale(scale) translate(-anchorX, -anchorY)`.
 */
export interface PoiModel {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Optional historic photo shown atop the detail drawer. */
  photo?: string;
  photoAlt?: string;
  photoCredit?: string;
  /** Projected map point the building stands on. */
  x: number;
  y: number;
  scale: number;
  anchorX: number;
  anchorY: number;
  /** Local bounding box of the drawing (for the click hit area). */
  width: number;
  height: number;
  parts: KeyedSubPath[];
  /** Screen-space anchor for the name label (above the building). */
  labelX: number;
  labelY: number;
}

export interface MapModel {
  width: number;
  height: number;
  boundaryD: string;
  /** The projected Prospect Park polygon path (used to clip the park trails). */
  parkD: string;
  parkPaths: RoughSubPath[];
  /** Prospect Park's water bodies (Lake, Lullwater, pools), filled blue and clipped to the park. */
  parkWaterPaths: KeyedSubPath[];
  /** Prospect Park footpaths, drawn as fine dotted trails (clipped to the park). */
  parkTrailPaths: KeyedSubPath[];
  /** The Prospect Park carriage loop, drawn bolder than the footpaths. */
  parkDrivePaths: KeyedSubPath[];
  /** Inner green spaces (e.g. Washington Park) drawn atop the neighborhood. */
  greenPaths: RoughSubPath[];
  /** Optional label for an inner green space. */
  greenLabel?: AvenueLabel;
  /**
   * The green wedge NE of the park (Mount Prospect Park, Brooklyn Botanic
   * Garden), drawn park-style on the paper above/right of the neighborhood.
   */
  northGreenPaths: KeyedSubPath[];
  /** Labels for each northern green space. */
  northGreenLabels: AvenueLabel[];
  /** Roads framing the northern wedge, drawn over the greens (clipped to northClip). */
  northStreetPaths: KeyedSubPath[];
  /**
   * Screen-space rectangle the northern section is drawn within, so the framing
   * roads (which run for miles in OSM) are trimmed to the wedge instead of
   * sprawling across the paper. Undefined when there is no northern section.
   */
  northClip?: { x: number; y: number; width: number; height: number };
  neighborhoodFill: RoughSubPath[];
  boundaryOutline: RoughSubPath[];
  streetPaths: KeyedSubPath[];
  /** Grand Army Plaza roads, drawn unclipped so the plaza spills past the boundary. */
  plazaPaths: KeyedSubPath[];
  avenueLabels: AvenueLabel[];
  /** Cross-street labels, revealed progressively via each label's minZoom. */
  streetLabels: AvenueLabel[];
  parkLabel: ParkLabel;
  /** Points of interest (hand-drawn landmark buildings). */
  pois: PoiModel[];
  /** Screen-space heading (degrees) that points to true north. */
  northAngle: number;
}

export interface BuildMapInput {
  boundary: Feature<Polygon>;
  park: Feature<Polygon | MultiPolygon>;
  /** An inner green space (e.g. Washington Park) painted over the neighborhood. */
  greens?: Feature<Polygon | MultiPolygon>;
  /** Additional, unlabeled green spaces (e.g. smaller playgrounds). */
  greenSpaces?: FeatureCollection<Polygon | MultiPolygon>;
  /** Green spaces NE of the park, above Flatbush Ave (Mount Prospect Park, BBG). */
  northGreens?: FeatureCollection<Polygon | MultiPolygon>;
  /** Roads that frame the northern wedge (Flatbush Ave, Eastern Pkwy, Washington Ave). */
  northStreets?: FeatureCollection<LineString | MultiLineString>;
  streets: FeatureCollection<LineString | MultiLineString>;
  /** Prospect Park's internal paths + carriage loop (each feature has kind). */
  parkTrails?: FeatureCollection<LineString | MultiLineString>;
  /** Prospect Park's water bodies (Lake, Lullwater, pools). */
  parkWater?: FeatureCollection<Polygon | MultiPolygon>;
  places?: FeatureCollection<Point>;
}

export interface BuildMapOptions {
  width: number;
  padding?: number;
  angle?: number;
}

/**
 * Pure builder shared by the React component and the offline preview renderer.
 * Projects the geometry, applies the hand-drawn styling, and returns a flat,
 * serializable model of everything that needs to be drawn.
 */
export function buildMapModel(
  { boundary, park, greens, greenSpaces, northGreens, northStreets, streets, parkTrails, parkWater, places }: BuildMapInput,
  { width, padding = 60, angle = DEFAULT_ANGLE }: BuildMapOptions
): MapModel {
  // Reserve room on the right so Prospect Park reads as a band on the east, and
  // (when present) room above for the green wedge NE of the park.
  const insetRight = Math.round(width * (northGreens?.features.length ? 0.32 : 0.2));
  const insetTop = northGreens?.features.length ? Math.round(width * 0.1) : 0;

  // Pass 1: fit to a square to discover the neighborhood's true aspect ratio.
  const probe = createProjection(boundary, { width, height: width, padding: 0, angle });
  const [[bx0, by0], [bx1, by1]] = probe.path.bounds(boundary);
  const aspect = (bx1 - bx0) / (by1 - by0) || 1;

  // Size the canvas so the neighborhood fits exactly in the content box
  // (width minus padding and the reserved park band; height also reserves the
  // top headroom for the northern greens).
  const contentW = width - 2 * padding - insetRight;
  const height = Math.round(contentW / aspect + 2 * padding + insetTop);

  // Pass 2: real projection fitted to the content box.
  const { path, project } = createProjection(boundary, { width, height, padding, insetRight, insetTop, angle });

  const boundaryD = path(boundary) ?? "";
  const parkD = path(park) ?? "";

  const parkPaths = roughen(parkD, {
    fill: COLORS.park,
    fillStyle: "solid",
    stroke: COLORS.parkInk,
    strokeWidth: 2,
    roughness: 1.8,
    bowing: 1.5,
    seed: 7,
  });

  // Prospect Park's water bodies (Lake, Lullwater, pools), painted blue over the
  // green. Roughened as filled polygons; the renderer clips them to the park so
  // any stray edges stay inside the green mass.
  const parkWaterPaths: KeyedSubPath[] = [];
  (parkWater?.features ?? []).forEach((f, i) => {
    const d = path(f) ?? "";
    if (!d) return;
    const sub = roughen(d, {
      fill: COLORS.water,
      fillStyle: "solid",
      stroke: "none",
      strokeWidth: 0,
      roughness: 1.6,
      bowing: 1.2,
      seed: i + 500,
    }).map((p, j) => ({ ...p, key: `water-${i}-${j}` }));
    parkWaterPaths.push(...sub);
  });

  // Inner green spaces sit *over* the neighborhood fill, so they need their own
  // roughened paths (and an optional label placed at the projected centroid).
  const greenD = greens ? path(greens) ?? "" : "";
  const greenPaths = greenD
    ? roughen(greenD, {
        fill: COLORS.park,
        fillStyle: "solid",
        stroke: COLORS.parkInk,
        strokeWidth: 1.6,
        roughness: 1.8,
        bowing: 1.5,
        seed: 23,
      })
    : [];
  // Smaller, unlabeled green spaces (other playgrounds) share the park look.
  const greenSpacePaths = (greenSpaces?.features ?? []).flatMap((f, i) => {
    const d = path(f) ?? "";
    if (!d) return [];
    return roughen(d, {
      fill: COLORS.park,
      fillStyle: "solid",
      stroke: COLORS.parkInk,
      strokeWidth: 1.4,
      roughness: 1.8,
      bowing: 1.3,
      seed: 41 + i,
    });
  });
  greenPaths.push(...greenSpacePaths);
  let greenLabel: AvenueLabel | undefined;
  if (greens) {
    const [[gx0, gy0], [gx1, gy1]] = path.bounds(greens);
    greenLabel = {
      name: (greens.properties?.name as string) ?? "",
      x: (gx0 + gx1) / 2,
      y: (gy0 + gy1) / 2,
      angle: 0,
    };
  }

  // The green wedge NE of the park (Mount Prospect Park, Brooklyn Botanic
  // Garden). Painted park-style on the paper, like Prospect Park's band; each
  // gets a label at its projected centroid.
  const northGreenPaths: KeyedSubPath[] = [];
  const northGreenLabels: AvenueLabel[] = [];
  (northGreens?.features ?? []).forEach((f, i) => {
    const d = path(f) ?? "";
    if (!d) return;
    const sub = roughen(d, {
      fill: COLORS.park,
      fillStyle: "solid",
      stroke: COLORS.parkInk,
      strokeWidth: 2,
      roughness: 1.8,
      bowing: 1.5,
      seed: i + 700,
    }).map((p, j) => ({ ...p, key: `north-${i}-${j}` }));
    northGreenPaths.push(...sub);
    const name = (f.properties?.name as string) ?? "";
    if (name) {
      const [[nx0, ny0], [nx1, ny1]] = path.bounds(f);
      northGreenLabels.push({ name, x: (nx0 + nx1) / 2, y: (ny0 + ny1) / 2, angle: 0 });
    }
  });

  // The section's screen extent: the greens' bounding box, grown upward to take
  // in Eastern Parkway (which runs above them) and right to the canvas edge. The
  // framing roads are clipped to this so they trace the wedge instead of running
  // off across the whole map.
  let northClip: MapModel["northClip"];
  if (northGreens?.features.length) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const f of northGreens.features) {
      const [[x0, y0], [x1, y1]] = path.bounds(f);
      minX = Math.min(minX, x0); minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1); maxY = Math.max(maxY, y1);
    }
    const x = Math.max(0, minX - 45);
    const top = Math.max(0, minY - 230);
    northClip = { x, y: top, width: width - x, height: maxY + 45 - top };
  }

  // The roads that frame the wedge, drawn avenue-weight (clipped to northClip in
  // the renderer) so they separate the section from Prospect Park and trace
  // Eastern Pkwy / Washington Ave.
  const northStreetPaths: KeyedSubPath[] = [];
  (northStreets?.features ?? []).forEach((f, i) => {
    const d = path(f) ?? "";
    if (!d) return;
    const sub = roughen(d, {
      stroke: COLORS.avenue,
      strokeWidth: 2.4,
      roughness: 1.5,
      bowing: 1.2,
      seed: i + 800,
      fill: "none",
    }).map((p, j) => ({ ...p, key: `north-st-${i}-${j}` }));
    northStreetPaths.push(...sub);
  });

  const neighborhoodFill = roughen(boundaryD, {
    fill: COLORS.neighborhood,
    fillStyle: "solid",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.5,
    seed: 11,
  });

  const boundaryOutline = roughen(boundaryD, {
    stroke: COLORS.ink,
    strokeWidth: 4,
    roughness: 2.4,
    bowing: 2.2,
    fill: "none",
    seed: 13,
  });

  // Grand Army Plaza sits right on the NE corner. Rather than draw its raw OSM
  // segments (which overshoot and double up into a messy tangle), we collect the
  // points that trace the oval and render one clean, hand-drawn ellipse that
  // pokes beyond the neighborhood outline.
  const streetPaths: KeyedSubPath[] = [];
  const plazaPts: [number, number][] = [];
  streets.features.forEach((f, i) => {
    if (PLAZA_STREETS.has((f.properties?.name as string) ?? "")) {
      if (PLAZA_OVAL.has((f.properties?.name as string) ?? "")) {
        plazaPts.push(...projectedPoints(f, project));
      }
      return; // never drawn as an ordinary street
    }
    const d = path(f) ?? "";
    if (!d) return;
    const isAvenue = f.properties?.kind === "avenue";
    const opts: RoughOptions = isAvenue
      ? { stroke: COLORS.avenue, strokeWidth: 2.4, roughness: 1.5, bowing: 1.2, seed: i + 100 }
      : { stroke: COLORS.street, strokeWidth: 1.1, roughness: 1.4, bowing: 1, seed: i + 100 };
    streetPaths.push(...roughen(d, opts).map((p, j) => ({ ...p, key: `${i}-${j}` })));
  });
  const plazaPaths = buildPlazaOval(plazaPts);

  // Prospect Park's internal circulation: fine footpaths + the bolder loop drive.
  // Both are roughened polylines; the renderer clips them to the park polygon and
  // dots/dashes them so they read as illustrated trails, not real roads.
  const parkTrailPaths: KeyedSubPath[] = [];
  const parkDrivePaths: KeyedSubPath[] = [];
  (parkTrails?.features ?? []).forEach((f, i) => {
    const isDrive = f.properties?.kind === "drive";
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
    lines.forEach((line, k) => {
      const pts = line.map((c) => project(c as [number, number]));
      if (pts.length < 2) return;
      const d = "M " + pts.map(([x, y]) => `${x} ${y}`).join(" L ");
      const opts: RoughOptions = isDrive
        ? { stroke: COLORS.parkDrive, strokeWidth: 1.8, roughness: 1.2, bowing: 1, seed: i + 300, fill: "none" }
        : { stroke: COLORS.parkTrail, strokeWidth: 1, roughness: 1, bowing: 0.8, seed: i + 300, fill: "none" };
      const sub = roughen(d, opts).map((p, j) => ({ ...p, key: `trail-${i}-${k}-${j}` }));
      (isDrive ? parkDrivePaths : parkTrailPaths).push(...sub);
    });
  });

  const pois = buildPois(places, project);
  // Keep street/avenue labels clear of the POI buildings by feeding their
  // on-map footprints in as points to avoid.
  const poiAvoid = pois.map((p) => [p.x, p.y - (p.anchorY * p.scale) / 2] as [number, number]);
  const avenueLabels = buildStreetLabels(streets, project, "avenue", poiAvoid);
  const streetLabels = buildStreetLabels(streets, project, "street", poiAvoid);

  // "Prospect Park" sits in the reserved band on the east. Drawn horizontally so
  // it reads as a flat map label rather than following the angled park edge, and
  // it doubles as a clickable POI (the label opens the park's detail drawer).
  const parkLabel: ParkLabel = {
    id: "prospect-park",
    name: "Prospect Park",
    x: width - insetRight * 0.5,
    // Drop the label into the park's body when the northern section is present,
    // so it clears the Botanic Garden / Mount Prospect labels up by the NE corner.
    y: height * (insetTop ? 0.6 : 0.42),
    angle: 0,
    category: "Park",
    description:
      "Brooklyn's 526-acre masterpiece, designed by Frederick Law Olmsted and Calvert Vaux \u2014 the same partnership behind Manhattan's Central Park \u2014 and built between 1865 and 1873. The pair considered Prospect Park their finest work, having learned from Central Park's constraints: here they had a freer hand to compose three grand landscapes that still define the park, the sweeping Long Meadow, the wooded Ravine with Brooklyn's only forest, and the 60-acre Lake. Its grand entrance at Grand Army Plaza, the Long Meadow, the Boathouse, the Ravine, and the Lake draw some ten million visitors a year.",
    photo: "/photos/prospect-park-map-1870.jpg",
    photoAlt:
      "Olmsted and Vaux's 1870 'Design for Prospect Park in the City of Brooklyn,' showing the Long Meadow, the Lake, and the system of drives",
    photoCredit:
      "Calvert Vaux & Frederick Law Olmsted, 'Design for Prospect Park,' 1870 \u00b7 Geographicus / Wikimedia Commons (public domain)",
  };

  // Heading that points to true north, so the compass rose is accurate.
  const n0 = project([-73.982, 40.665]);
  const n1 = project([-73.982, 40.67]);
  const northAngle = (Math.atan2(n1[1] - n0[1], n1[0] - n0[0]) * 180) / Math.PI;

  return {
    width,
    height,
    boundaryD,
    parkD,
    parkPaths,
    parkWaterPaths,
    parkTrailPaths,
    parkDrivePaths,
    greenPaths,
    greenLabel,
    northGreenPaths,
    northGreenLabels,
    northStreetPaths,
    northClip,
    neighborhoodFill,
    boundaryOutline,
    streetPaths,
    plazaPaths,
    avenueLabels,
    streetLabels,
    parkLabel,
    pois,
    northAngle,
  };
}

/**
 * Turn each place feature into a roughened, projected building. A feature is
 * skipped if it lacks a known `building` builder, so data can outrun art.
 */
function buildPois(
  places: FeatureCollection<Point> | undefined,
  project: (coord: [number, number]) => [number, number]
): PoiModel[] {
  if (!places) return [];
  const pois: PoiModel[] = [];

  for (const feature of places.features) {
    const props = feature.properties ?? {};
    const buildingKey = props.building as string | undefined;
    const builder = buildingKey ? BUILDINGS[buildingKey] : undefined;
    if (!builder) continue;

    const drawing = builder();
    const [x, y] = project(feature.geometry.coordinates as [number, number]);

    const parts: KeyedSubPath[] = drawing.parts.flatMap((part, i) =>
      roughen(part.d, {
        fill: part.fill,
        fillStyle: part.fillStyle ?? "hachure",
        stroke: part.stroke ?? COLORS.ink,
        strokeWidth: part.strokeWidth ?? 1.2,
        roughness: part.roughness ?? 1,
        bowing: part.bowing ?? 1,
        seed: part.seed,
      }).map((p, j) => ({ ...p, key: `${i}-${j}` }))
    );

    pois.push({
      id: (props.id as string) ?? buildingKey ?? "poi",
      name: (props.name as string) ?? "",
      category: (props.category as string) ?? "",
      description: (props.description as string) ?? "",
      photo: (props.photo as string) ?? undefined,
      photoAlt: (props.photoAlt as string) ?? undefined,
      photoCredit: (props.photoCredit as string) ?? undefined,
      x,
      y,
      scale: drawing.scale,
      anchorX: drawing.anchorX,
      anchorY: drawing.anchorY,
      width: drawing.width,
      height: drawing.height,
      parts,
      labelX: x,
      labelY: y - drawing.anchorY * drawing.scale - 9,
    });
  }

  return pois;
}


// Cross-street labels fade in between these zoom factors: the longest street
// appears first (near MIN), the shortest last (near MAX).
const STREET_LABEL_MIN_ZOOM = 2;
const STREET_LABEL_MAX_ZOOM = 4.5;

// A label is nudged off its street's midpoint if a POI sits within this many
// screen pixels, so building markers and labels don't overlap.
const LABEL_POI_CLEARANCE = 46;

// Per-street manual label tweaks (screen-space). `dx` shifts the label right
// (+) or left (−) to dodge overlaps; `angle` forces a fixed rotation in degrees
// (0 = horizontal) instead of following the street's local heading.
const LABEL_OVERRIDES: Record<string, { dx?: number; angle?: number }> = {
  "Prospect Park Southwest": { dx: 130 },
  "Bartel Pritchard Square": { angle: 0 },
};

/** Pick the polyline vertex for a label: the midpoint, unless a POI is too
 * close, in which case the nearest-to-center vertex that clears all POIs (or,
 * failing that, the vertex farthest from any POI). */
function pickLabelIndex(
  coords: [number, number][],
  avoid: [number, number][]
): number {
  const mid = Math.floor(coords.length / 2);
  if (avoid.length === 0 || coords.length < 3) return mid;
  const minDist = (p: [number, number]) =>
    Math.min(...avoid.map(([ax, ay]) => Math.hypot(p[0] - ax, p[1] - ay)));
  if (minDist(coords[mid]) >= LABEL_POI_CLEARANCE) return mid;

  let clearIdx = -1;
  let clearDelta = Infinity;
  let farIdx = mid;
  let farDist = -Infinity;
  for (let i = 1; i < coords.length - 1; i++) {
    const d = minDist(coords[i]);
    if (d >= LABEL_POI_CLEARANCE && Math.abs(i - mid) < clearDelta) {
      clearDelta = Math.abs(i - mid);
      clearIdx = i;
    }
    if (d > farDist) {
      farDist = d;
      farIdx = i;
    }
  }
  return clearIdx >= 0 ? clearIdx : farIdx;
}

/** Flatten a (Multi)LineString feature into projected screen-space points. */
function projectedPoints(
  f: Feature<LineString | MultiLineString>,
  project: (coord: [number, number]) => [number, number]
): [number, number][] {
  const g = f.geometry;
  const lines = g.type === "LineString" ? [g.coordinates] : g.coordinates;
  const out: [number, number][] = [];
  for (const line of lines) for (const c of line) out.push(project(c as [number, number]));
  return out;
}

/**
 * Fit a clean, hand-drawn oval to the points tracing Grand Army Plaza. Uses the
 * point cloud's covariance to recover the oval's center, tilt, and radii (points
 * on an ellipse perimeter have variance r²/2 along each axis), then roughens a
 * single ellipse path so it matches the illustrated look without the clutter of
 * the raw road segments.
 */
function buildPlazaOval(pts: [number, number][]): KeyedSubPath[] {
  if (pts.length < 4) return [];
  const n = pts.length;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  cx /= n;
  cy /= n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of pts) {
    const dx = x - cx;
    const dy = y - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= n;
  syy /= n;
  sxy /= n;

  const tr = sxx + syy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - (sxx * syy - sxy * sxy)));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  const rx = Math.sqrt(Math.max(0, 2 * l1));
  const ry = Math.sqrt(Math.max(0, 2 * l2));
  const angle = Math.atan2(l1 - sxx, sxy || 1e-6);
  const deg = (angle * 180) / Math.PI;

  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const ax = cx + rx * ca;
  const ay = cy + rx * sa;
  const bx = cx - rx * ca;
  const by = cy - rx * sa;
  const d = `M ${ax} ${ay} A ${rx} ${ry} ${deg} 0 1 ${bx} ${by} A ${rx} ${ry} ${deg} 0 1 ${ax} ${ay} Z`;

  return roughen(d, {
    fill: COLORS.park,
    fillStyle: "solid",
    stroke: COLORS.parkInk,
    strokeWidth: 2,
    roughness: 1.6,
    bowing: 1.2,
    seed: 99,
  }).map((p, j) => ({ ...p, key: `plaza-${j}` }));
}

function buildStreetLabels(
  collection: FeatureCollection<LineString | MultiLineString>,
  project: (coord: [number, number]) => [number, number],
  kind: "avenue" | "street",
  avoid: [number, number][] = []
): AvenueLabel[] {
  const longest = new Map<string, { coords: [number, number][]; length: number }>();

  for (const f of collection.features) {
    const name = f.properties?.name as string | undefined;
    if (!name || f.properties?.kind !== kind) continue;
    const lines =
      f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const line of lines) {
      const pts = line.map((c) => project(c as [number, number]));
      let length = 0;
      for (let i = 1; i < pts.length; i++) {
        length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      }
      const prev = longest.get(name);
      if (!prev || length > prev.length) longest.set(name, { coords: pts, length });
    }
  }

  const entries = [...longest.values()].filter((e) => e.coords.length >= 2);
  const lengths = entries.map((e) => e.length);
  const maxLen = Math.max(...lengths, 1);
  const minLen = Math.min(...lengths, 0);
  const span = maxLen - minLen || 1;

  const labels: AvenueLabel[] = [];
  for (const [name, { coords, length }] of longest) {
    if (coords.length < 2) continue;
    const mid = pickLabelIndex(coords, avoid);
    const a = coords[Math.max(0, mid - 1)];
    const b = coords[Math.min(coords.length - 1, mid + 1)];
    let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;

    let minZoom: number | undefined;
    if (kind === "street") {
      // Longer streets (t→1) reveal earlier (lower zoom threshold).
      const t = (length - minLen) / span;
      minZoom =
        STREET_LABEL_MAX_ZOOM - t * (STREET_LABEL_MAX_ZOOM - STREET_LABEL_MIN_ZOOM);
    }

    let x = coords[mid][0];
    const y = coords[mid][1];
    const override = LABEL_OVERRIDES[name];
    if (override?.dx) x += override.dx;
    if (override?.angle !== undefined) angle = override.angle;

    labels.push({ name, x, y, angle, minZoom });
  }
  return labels;
}
