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
  parkPaths: RoughSubPath[];
  /** Inner green spaces (e.g. Washington Park) drawn atop the neighborhood. */
  greenPaths: RoughSubPath[];
  /** Optional label for an inner green space. */
  greenLabel?: AvenueLabel;
  neighborhoodFill: RoughSubPath[];
  boundaryOutline: RoughSubPath[];
  streetPaths: KeyedSubPath[];
  /** Grand Army Plaza roads, drawn unclipped so the plaza spills past the boundary. */
  plazaPaths: KeyedSubPath[];
  avenueLabels: AvenueLabel[];
  /** Cross-street labels, revealed progressively via each label's minZoom. */
  streetLabels: AvenueLabel[];
  parkLabel: AvenueLabel;
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
  streets: FeatureCollection<LineString | MultiLineString>;
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
  { boundary, park, greens, greenSpaces, streets, places }: BuildMapInput,
  { width, padding = 60, angle = DEFAULT_ANGLE }: BuildMapOptions
): MapModel {
  // Reserve room on the right so Prospect Park reads as a band on the east.
  const insetRight = Math.round(width * 0.2);

  // Pass 1: fit to a square to discover the neighborhood's true aspect ratio.
  const probe = createProjection(boundary, { width, height: width, padding: 0, angle });
  const [[bx0, by0], [bx1, by1]] = probe.path.bounds(boundary);
  const aspect = (bx1 - bx0) / (by1 - by0) || 1;

  // Size the canvas so the neighborhood fits exactly in the content box
  // (width minus padding and the reserved park band).
  const contentW = width - 2 * padding - insetRight;
  const height = Math.round(contentW / aspect + 2 * padding);

  // Pass 2: real projection fitted to the content box.
  const { path, project } = createProjection(boundary, { width, height, padding, insetRight, angle });

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

  const pois = buildPois(places, project);
  // Keep street/avenue labels clear of the POI buildings by feeding their
  // on-map footprints in as points to avoid.
  const poiAvoid = pois.map((p) => [p.x, p.y - (p.anchorY * p.scale) / 2] as [number, number]);
  const avenueLabels = buildStreetLabels(streets, project, "avenue", poiAvoid);
  const streetLabels = buildStreetLabels(streets, project, "street", poiAvoid);

  // "Prospect Park" runs along the park band, parallel to the avenues. Anchor it
  // to the reserved band in screen space so it always lands cleanly in the green.
  const bandA = project([-73.969, 40.66]);
  const bandB = project([-73.969, 40.671]);
  let bandAngle = (Math.atan2(bandB[1] - bandA[1], bandB[0] - bandA[0]) * 180) / Math.PI;
  if (bandAngle > 90) bandAngle -= 180;
  if (bandAngle < -90) bandAngle += 180;
  const parkLabel: AvenueLabel = {
    name: "Prospect Park",
    x: width - insetRight * 0.5,
    y: height * 0.42,
    angle: bandAngle,
  };

  // Heading that points to true north, so the compass rose is accurate.
  const n0 = project([-73.982, 40.665]);
  const n1 = project([-73.982, 40.67]);
  const northAngle = (Math.atan2(n1[1] - n0[1], n1[0] - n0[0]) * 180) / Math.PI;

  return {
    width,
    height,
    boundaryD,
    parkPaths,
    greenPaths,
    greenLabel,
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
    labels.push({ name, x: coords[mid][0], y: coords[mid][1], angle, minZoom });
  }
  return labels;
}
