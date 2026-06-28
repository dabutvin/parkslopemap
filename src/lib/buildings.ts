/**
 * Hand-drawn building illustrations for points of interest.
 *
 * Each builder returns a *pure*, serializable `BuildingDrawing`: a set of SVG
 * path parts in a local coordinate system plus a ground anchor. `buildMap.ts`
 * roughens the parts (so they share the map's sketchy look) and places the
 * anchor at the projected map point. Keep this file free of React/DOM/rough.js
 * imports so the node preview renderer can import it directly.
 *
 * To add a new POI: write a builder, register it in `BUILDINGS`, and point a
 * feature in `src/data/places.geojson` at it via its `building` property.
 */

export interface BuildingPart {
  d: string;
  /** Fill color, or omitted for an unfilled (stroke-only) part. */
  fill?: string;
  /** Stroke color; defaults to the ink color when omitted. */
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  fillStyle?: "solid" | "hachure";
  /** Stable seed so the sketchiness doesn't reshuffle between renders. */
  seed: number;
}

export interface BuildingDrawing {
  /** Local bounding box, used only for sanity/label placement. */
  width: number;
  height: number;
  /** Local point that should sit on the map (bottom-center / sidewalk). */
  anchorX: number;
  anchorY: number;
  /** Default on-map scale; tunable per building. */
  scale: number;
  parts: BuildingPart[];
}

/** Warm palette that harmonizes with the map's paper + sage + ink. */
const C = {
  wall: "#c89567",
  wallDark: "#a8794c",
  stone: "#ecdab4",
  stoneDark: "#d6bd91",
  roof: "#7d6b58",
  roofDark: "#64543f",
  glass: "#7e9498",
  ink: "#5b4a3a",
  frieze: "#b5623f",
  chimney: "#a06848",
  chimneyCap: "#7c4f37",
  door: "#6b4a2f",
};

const rect = (x: number, y: number, w: number, h: number): string =>
  `M ${r(x)} ${r(y)} h ${r(w)} v ${r(h)} h ${r(-w)} Z`;

/** A round-topped (semicircular) arched opening, flat at the bottom. */
function archWindow(left: number, topY: number, w: number, h: number): string {
  const rad = w / 2;
  const spring = topY + rad;
  const bot = topY + h;
  return (
    `M ${r(left)} ${r(bot)} L ${r(left)} ${r(spring)} ` +
    `A ${r(rad)} ${r(rad)} 0 0 1 ${r(left + w)} ${r(spring)} ` +
    `L ${r(left + w)} ${r(bot)} Z`
  );
}

/** A coarse hand-drawn ellipse (for the ground shadow). */
function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `M ${r(cx - rx)} ${r(cy)} ` +
    `A ${r(rx)} ${r(ry)} 0 0 1 ${r(cx + rx)} ${r(cy)} ` +
    `A ${r(rx)} ${r(ry)} 0 0 1 ${r(cx - rx)} ${r(cy)} Z`
  );
}

/** Evenly distribute `n` items of width `w` across [x0, x1]; returns left edges. */
function spread(x0: number, x1: number, n: number, w: number): number[] {
  const gap = (x1 - x0 - n * w) / (n + 1);
  return Array.from({ length: n }, (_, i) => x0 + gap * (i + 1) + i * w);
}

const r = (n: number): number => Math.round(n * 100) / 100;

/**
 * The Montauk Club (1891, Francis H. Kimball): a Venetian Gothic palazzo. Drawn
 * as a richly detailed elevation — terra-cotta cornice and frieze, a third-floor
 * loggia of small arches, a piano-nobile row of tall arched windows, and an
 * arched ground-floor entrance — with a shaded right return to give it mass.
 */
function montaukClub(): BuildingDrawing {
  const FW = 110; // front (Eighth Avenue) face width
  const DX = 13; // shaded right-return depth
  const parts: BuildingPart[] = [];

  let seed = 20;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical bands (top-down). A roof zone of height ROOF sits above the
  // cornice, so the whole facade is pushed down by ROOF.
  const ROOF = 38;
  const yChimneyTop = 0; // tops of the tallest chimneys / corner peak
  const yRidge = 14; // top edge of the hipped roof slope
  const yCorniceTop = ROOF; // eaves: where the roof meets the cornice
  const yFrieze = ROOF + 12;
  const yLoggia = ROOF + 26;
  const yPiano = ROOF + 60;
  const ySill2 = ROOF + 96; // sill line under piano nobile
  const yGround = ROOF + 104;
  const yBase = ROOF + 150;
  const yWater = ROOF + 156;

  // Ground shadow first, so the building sits on top of it.
  push({
    d: ellipse(FW / 2 + 4, yWater + 2, FW * 0.62, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Right return (the building's side / mass), shaded.
  push({
    d: `M ${r(FW)} ${yCorniceTop} L ${r(FW + DX)} ${r(yCorniceTop + 7)} ` +
      `L ${r(FW + DX)} ${r(yWater - 4)} L ${r(FW)} ${r(yWater)} Z`,
    fill: C.wallDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });

  // Front wall.
  push({
    d: rect(0, yFrieze, FW, yWater - yFrieze),
    fill: C.wall,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1.1,
    bowing: 0.8,
    fillStyle: "solid",
  });

  // --- Roof zone (the Montauk Club's signature silhouette) ---
  // Chimneys first, so the roof draws over their bases.
  const chimney = (cx: number, w: number, topY: number) => {
    push({
      d: rect(cx - w / 2, topY, w, yCorniceTop - topY),
      fill: C.chimney,
      stroke: C.ink,
      strokeWidth: 1.1,
      roughness: 1,
      fillStyle: "solid",
    });
    push({
      d: rect(cx - w / 2 - 1.5, topY, w + 3, 4),
      fill: C.chimneyCap,
      stroke: C.ink,
      strokeWidth: 1,
      roughness: 0.9,
      fillStyle: "solid",
    });
  };
  chimney(20, 8, 4);
  chimney(58, 7, 10);
  chimney(92, 8, 2);

  // Hipped roof: a front slope (trapezoid) plus a darker right hip over the return.
  push({
    d: `M ${r(0)} ${r(yCorniceTop)} L ${r(FW)} ${r(yCorniceTop)} ` +
      `L ${r(FW - 18)} ${r(yRidge)} L ${r(18)} ${r(yRidge)} Z`,
    fill: C.roof,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(FW)} ${r(yCorniceTop)} L ${r(FW + DX)} ${r(yCorniceTop + 7)} ` +
      `L ${r(FW + DX - 5)} ${r(yRidge + 6)} L ${r(FW - 18)} ${r(yRidge)} Z`,
    fill: C.roofDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  // Taller corner pavilion peak over the return side.
  push({
    d: `M ${r(FW - 26)} ${r(yRidge + 1)} L ${r(FW - 4)} ${r(yRidge + 1)} ` +
      `L ${r(FW - 15)} ${r(yChimneyTop + 3)} Z`,
    fill: C.roofDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });

  // Dormers poking up from the front slope.
  for (const cx of spread(10, FW - 16, 3, 13)) {
    const top = yRidge + 6;
    const eave = yCorniceTop - 2;
    push({
      d: `M ${r(cx)} ${r(eave)} L ${r(cx)} ${r(top + 4)} ` +
        `L ${r(cx + 6.5)} ${r(top)} L ${r(cx + 13)} ${r(top + 4)} ` +
        `L ${r(cx + 13)} ${r(eave)} Z`,
      fill: C.stone,
      stroke: C.ink,
      strokeWidth: 1,
      roughness: 0.9,
      fillStyle: "solid",
    });
    push({
      d: rect(cx + 3, top + 6, 7, eave - top - 8),
      fill: C.glass,
      stroke: C.ink,
      strokeWidth: 0.8,
      roughness: 0.8,
      fillStyle: "solid",
    });
  }

  // Water table / base course.
  push({
    d: rect(-2, yBase, FW + 4, yWater - yBase + 2),
    fill: C.stoneDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });

  // Bracketed cornice (overhangs both sides + over the return).
  push({
    d: rect(-4, yCorniceTop, FW + 8 + DX, yFrieze - yCorniceTop + 2),
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 0.9,
    fillStyle: "solid",
  });
  // Dentils along the cornice underside.
  for (const x of spread(2, FW - 2, 16, 3)) {
    push({
      d: rect(x, yFrieze - 1, 3, 3),
      fill: C.stoneDark,
      stroke: "none",
      strokeWidth: 0,
      roughness: 0.6,
      fillStyle: "solid",
    });
  }

  // Terra-cotta frieze band with figural tick marks.
  push({
    d: rect(0, yFrieze, FW, yLoggia - yFrieze),
    fill: C.frieze,
    stroke: C.ink,
    strokeWidth: 1,
    roughness: 0.9,
    fillStyle: "solid",
  });
  for (const x of spread(4, FW - 4, 13, 2)) {
    push({
      d: rect(x, yFrieze + 3, 2, 8),
      fill: C.stone,
      stroke: "none",
      strokeWidth: 0,
      roughness: 0.7,
      fillStyle: "solid",
    });
  }

  // Third-floor loggia: a row of small round-arched windows.
  const loggiaH = yPiano - yLoggia - 4;
  for (const x of spread(6, FW - 6, 8, 9)) {
    push({
      d: archWindow(x, yLoggia + 2, 9, loggiaH),
      fill: C.glass,
      stroke: C.ink,
      strokeWidth: 1.1,
      roughness: 0.9,
      fillStyle: "solid",
    });
  }
  // String course beneath the loggia.
  push({
    d: rect(-1, yPiano - 3, FW + 2, 3),
    fill: C.stone,
    stroke: "none",
    strokeWidth: 0,
    roughness: 0.8,
    fillStyle: "solid",
  });

  // Piano nobile: tall arched windows with mullions + a continuous sill.
  const pianoH = ySill2 - yPiano - 2;
  for (const x of spread(8, FW - 8, 4, 17)) {
    push({
      d: archWindow(x, yPiano + 2, 17, pianoH),
      fill: C.glass,
      stroke: C.ink,
      strokeWidth: 1.3,
      roughness: 0.9,
      fillStyle: "solid",
    });
    // Vertical mullion + transom.
    const cx = x + 17 / 2;
    const spring = yPiano + 2 + 17 / 2;
    const bot = yPiano + 2 + pianoH;
    push({
      d: `M ${r(cx)} ${r(spring - 4)} L ${r(cx)} ${r(bot)}`,
      stroke: C.ink,
      strokeWidth: 0.8,
      roughness: 0.8,
    });
    push({
      d: `M ${r(x + 1)} ${r(spring + 8)} L ${r(x + 16)} ${r(spring + 8)}`,
      stroke: C.ink,
      strokeWidth: 0.8,
      roughness: 0.8,
    });
  }
  push({
    d: rect(-1, ySill2, FW + 2, 3),
    fill: C.stoneDark,
    stroke: "none",
    strokeWidth: 0,
    roughness: 0.8,
    fillStyle: "solid",
  });

  // Ground floor: arched entrance flanked by arched windows.
  const groundH = yBase - yGround;
  const doorW = 20;
  const doorX = FW / 2 - doorW / 2;
  // Flanking windows (two per side).
  const winXs = [...spread(6, doorX - 4, 2, 16), ...spread(doorX + doorW + 4, FW - 6, 2, 16)];
  for (const x of winXs) {
    push({
      d: archWindow(x, yGround + 6, 16, groundH - 10),
      fill: C.glass,
      stroke: C.ink,
      strokeWidth: 1.3,
      roughness: 0.9,
      fillStyle: "solid",
    });
    const cx = x + 8;
    push({
      d: `M ${r(cx)} ${r(yGround + 6 + 8)} L ${r(cx)} ${r(yBase - 4)}`,
      stroke: C.ink,
      strokeWidth: 0.7,
      roughness: 0.8,
    });
  }
  // Arched entrance.
  push({
    d: archWindow(doorX, yGround, doorW, groundH),
    fill: C.door,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 0.9,
    fillStyle: "solid",
  });
  // Door split.
  push({
    d: `M ${r(FW / 2)} ${r(yGround + doorW / 2)} L ${r(FW / 2)} ${r(yBase)}`,
    stroke: C.stone,
    strokeWidth: 0.8,
    roughness: 0.7,
  });
  // Stoop steps below the entrance.
  push({
    d: rect(doorX - 4, yBase, doorW + 8, 3),
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 0.8,
    roughness: 0.7,
    fillStyle: "solid",
  });
  push({
    d: rect(doorX - 7, yWater - 1, doorW + 14, 3),
    fill: C.stoneDark,
    stroke: C.ink,
    strokeWidth: 0.8,
    roughness: 0.7,
    fillStyle: "solid",
  });

  return {
    width: FW + DX,
    height: yWater + 6,
    anchorX: FW / 2,
    anchorY: yWater,
    scale: 0.42,
    parts,
  };
}

export type BuildingBuilder = () => BuildingDrawing;

/** Registry of POI building illustrations, keyed by the feature's `building`. */
export const BUILDINGS: Record<string, BuildingBuilder> = {
  "montauk-club": montaukClub,
};
