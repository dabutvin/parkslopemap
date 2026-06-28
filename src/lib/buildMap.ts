import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
} from "geojson";
import { createProjection, DEFAULT_ANGLE } from "./projection";
import { roughen, type RoughOptions, type RoughSubPath } from "./roughen";

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

export interface AvenueLabel {
  name: string;
  x: number;
  y: number;
  angle: number;
}

export interface KeyedSubPath extends RoughSubPath {
  key: string;
}

export interface MapModel {
  width: number;
  height: number;
  boundaryD: string;
  parkPaths: RoughSubPath[];
  neighborhoodFill: RoughSubPath[];
  boundaryOutline: RoughSubPath[];
  streetPaths: KeyedSubPath[];
  avenueLabels: AvenueLabel[];
  parkLabel: AvenueLabel;
  /** Screen-space heading (degrees) that points to true north. */
  northAngle: number;
}

export interface BuildMapInput {
  boundary: Feature<Polygon>;
  park: Feature<Polygon | MultiPolygon>;
  streets: FeatureCollection<LineString | MultiLineString>;
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
  { boundary, park, streets }: BuildMapInput,
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

  const streetPaths: KeyedSubPath[] = streets.features.flatMap((f, i) => {
    const d = path(f) ?? "";
    if (!d) return [];
    const isAvenue = f.properties?.kind === "avenue";
    const opts: RoughOptions = isAvenue
      ? { stroke: COLORS.avenue, strokeWidth: 2.4, roughness: 1.5, bowing: 1.2, seed: i + 100 }
      : { stroke: COLORS.street, strokeWidth: 1.1, roughness: 1.4, bowing: 1, seed: i + 100 };
    return roughen(d, opts).map((p, j) => ({ ...p, key: `${i}-${j}` }));
  });

  const avenueLabels = buildAvenueLabels(streets, project);

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
    neighborhoodFill,
    boundaryOutline,
    streetPaths,
    avenueLabels,
    parkLabel,
    northAngle,
  };
}


function buildAvenueLabels(
  collection: FeatureCollection<LineString | MultiLineString>,
  project: (coord: [number, number]) => [number, number]
): AvenueLabel[] {
  const longest = new Map<string, { coords: [number, number][]; length: number }>();

  for (const f of collection.features) {
    const name = f.properties?.name as string | undefined;
    if (!name || f.properties?.kind !== "avenue") continue;
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

  const labels: AvenueLabel[] = [];
  for (const [name, { coords }] of longest) {
    if (coords.length < 2) continue;
    const mid = Math.floor(coords.length / 2);
    const a = coords[Math.max(0, mid - 1)];
    const b = coords[Math.min(coords.length - 1, mid + 1)];
    let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    labels.push({ name, x: coords[mid][0], y: coords[mid][1], angle });
  }
  return labels;
}
