/** Dev-only: rasterize a single building drawing large, to inspect detail. */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { BUILDINGS } from "../src/lib/buildings";
import { roughen } from "../src/lib/roughen";
import { COLORS } from "../src/lib/buildMap";

const key = process.argv[2] ?? "montauk-club";
const drawing = BUILDINGS[key]();
const S = 4;
const pad = 30;
const W = drawing.width * S + pad * 2;
const H = drawing.height * S + pad * 2;

const parts = drawing.parts.flatMap((part) =>
  roughen(part.d, {
    fill: part.fill,
    fillStyle: part.fillStyle ?? "hachure",
    stroke: part.stroke ?? COLORS.ink,
    strokeWidth: part.strokeWidth ?? 1.2,
    roughness: part.roughness ?? 1,
    bowing: part.bowing ?? 1,
    seed: part.seed,
  })
);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.neighborhood}"/>
  <g transform="translate(${pad} ${pad}) scale(${S})">
    ${parts
      .map((p) => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? "none"}" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join("")}
  </g>
</svg>`;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, `building-${key}.png`);
writeFileSync(out, new Resvg(svg).render().asPng());
console.log(`Wrote ${out} (${W}x${H})`);
