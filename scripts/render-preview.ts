/**
 * Offline preview: builds the exact same map model the app uses and rasterizes
 * it to a PNG so the look, borders, and orientation can be checked without a
 * browser. Run with `npx tsx scripts/render-preview.ts`. Dev-only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
  Polygon,
  MultiPolygon,
} from "geojson";
import type { PlaceProperties } from "../src/lib/places";
import type { SubwayStopProperties } from "../src/lib/subway";
import { buildMapModel, COLORS } from "../src/lib/buildMap";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src", "data");
const read = (f: string) => JSON.parse(readFileSync(join(dataDir, f), "utf8"));

const boundary = read("park-slope-boundary.geojson") as Feature<Polygon>;
const park = read("prospect-park.geojson") as Feature<Polygon | MultiPolygon>;
const greens = read("washington-park.geojson") as Feature<Polygon | MultiPolygon>;
const greenSpaces = read("green-spaces.geojson") as FeatureCollection<Polygon | MultiPolygon>;
const streets = read("streets.geojson") as FeatureCollection<LineString | MultiLineString>;
let northGreens: FeatureCollection<Polygon | MultiPolygon> | undefined;
try {
  northGreens = read("north-greens.geojson") as FeatureCollection<Polygon | MultiPolygon>;
} catch {
  northGreens = undefined;
}
let northStreets: FeatureCollection<LineString | MultiLineString> | undefined;
try {
  northStreets = read("north-streets.geojson") as FeatureCollection<LineString | MultiLineString>;
} catch {
  northStreets = undefined;
}
const places = read("places.geojson") as FeatureCollection<Point, PlaceProperties>;
const subwayStops = read("subway-stops.geojson") as FeatureCollection<Point, SubwayStopProperties>;
let parkTrails: FeatureCollection<LineString | MultiLineString> | undefined;
try {
  parkTrails = read("prospect-park-paths.geojson") as FeatureCollection<LineString | MultiLineString>;
} catch {
  parkTrails = undefined;
}
let parkWater: FeatureCollection<Polygon | MultiPolygon> | undefined;
try {
  parkWater = read("prospect-park-water.geojson") as FeatureCollection<Polygon | MultiPolygon>;
} catch {
  parkWater = undefined;
}

const angle = process.argv[2] === undefined ? NaN : Number(process.argv[2]);
const model = buildMapModel({ boundary, park, greens, greenSpaces, northGreens, northStreets, streets, parkTrails, parkWater, places, subwayStops }, { width: 1000, ...(Number.isFinite(angle) ? { angle } : {}) });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${model.width} ${model.height}" width="${model.width}" height="${model.height}">
  <defs>
    <clipPath id="c"><path d="${model.boundaryD}"/></clipPath>
    <clipPath id="park"><path d="${model.parkD}"/></clipPath>
    ${model.northClip ? `<clipPath id="north"><rect x="${model.northClip.x}" y="${model.northClip.y}" width="${model.northClip.width}" height="${model.northClip.height}"/></clipPath>` : ""}
  </defs>
  <rect x="0" y="0" width="${model.width}" height="${model.height}" fill="${COLORS.paper}"/>
  <g>${model.parkPaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}"/>`).join("")}</g>
  <g>${model.northGreenPaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}"/>`).join("")}</g>
  <g clip-path="url(#park)">${model.parkWaterPaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}" stroke-linejoin="round"/>`).join("")}</g>
  <g clip-path="url(#park)" fill="none" stroke-linecap="round">
    ${model.parkTrailPaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-dasharray="0.5 4"/>`).join("")}
    ${model.parkDrivePaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-dasharray="7 5"/>`).join("")}
  </g>
  <g>${model.neighborhoodFill.map((p) => `<path d="${p.d}" stroke="none" fill="${p.fill ?? COLORS.neighborhood}"/>`).join("")}</g>
  <g>${model.greenPaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}"/>`).join("")}</g>
  <g clip-path="url(#c)">${model.streetPaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="none" stroke-linecap="round"/>`).join("")}</g>
  <g>${model.boundaryOutline.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</g>
  <g>${model.plazaPaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}" stroke-linecap="round"/>`).join("")}</g>
  <g${model.northClip ? ` clip-path="url(#north)"` : ""}>${model.northStreetPaths.map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="none" stroke-linecap="round"/>`).join("")}</g>
  ${model.subwayStops
    .map(
      (stop) =>
        `<g transform="translate(${stop.x} ${stop.y}) scale(${stop.scale}) translate(${-stop.anchorX} ${-stop.anchorY})">${stop.bullets
          .map(
            (bullet) =>
              `${bullet.parts
                .map(
                  (p) =>
                    `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}" stroke-linecap="round" stroke-linejoin="round"/>`
                )
                .join("")}<text x="${bullet.cx}" y="${bullet.cy + 1}" font-family="sans-serif" font-size="11" font-weight="700" fill="#f7f0df" text-anchor="middle" dominant-baseline="middle">${esc(
                bullet.line
              )}</text>`
          )
          .join("")}</g>`
    )
    .join("")}
  ${model.pois
    .map(
      (poi) =>
        `<g transform="translate(${poi.x} ${poi.y}) scale(${poi.scale}) translate(${-poi.anchorX} ${-poi.anchorY})">${poi.parts
          .map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}" stroke-linecap="round" stroke-linejoin="round"/>`)
          .join("")}</g>`
    )
    .join("")}
  <g font-family="sans-serif">
    <text x="${model.parkLabel.x}" y="${model.parkLabel.y}" font-size="30" font-weight="700" fill="#5a6f49" text-anchor="middle" transform="rotate(${model.parkLabel.angle} ${model.parkLabel.x} ${model.parkLabel.y})">${esc(model.parkLabel.name)}</text>
    <text x="${model.plazaLabel.x}" y="${model.plazaLabel.y}" font-size="18" font-weight="700" fill="#5a6f49" text-anchor="middle" transform="rotate(${model.plazaLabel.angle} ${model.plazaLabel.x} ${model.plazaLabel.y})">${esc(model.plazaLabel.name)}</text>
    ${model.northGreenLabels
      .map(
        (l) =>
          `<text x="${l.x}" y="${l.y}" font-size="14" font-weight="700" fill="#5a6f49" text-anchor="middle">${esc(l.name)}</text>`
      )
      .join("")}
    ${model.greenLabel ? `<text x="${model.greenLabel.x}" y="${model.greenLabel.y}" font-size="13" font-weight="700" fill="#5a6f49" text-anchor="middle">${esc(model.greenLabel.name)}</text>` : ""}
    ${model.avenueLabels
      .map(
        (l) =>
          `<text x="${l.x}" y="${l.y}" font-size="16" fill="${COLORS.avenue}" text-anchor="middle" transform="rotate(${l.angle} ${l.x} ${l.y})">${esc(l.name)}</text>`
      )
      .join("")}
  </g>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: "width", value: 1000 } }).render().asPng();
const suffix = Number.isFinite(angle) ? `-${angle}` : "-default";
const out = join(root, `preview${suffix}.png`);
writeFileSync(out, png);
console.log(`Wrote ${out} (${model.width}x${model.height})`);
