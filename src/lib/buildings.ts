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
  // Brownstone tones (the warm terra-cotta Park Slope rowhouse at 640 2nd St).
  brown: "#b56e41", // lit front face
  brownMid: "#9c5d36", // bay returns / mid shade
  brownDark: "#834b2b", // deep shade / garden base
  brownTrim: "#cf9a61", // carved stone bands, lintels, stoop
  carve: "#c2854f", // carved foliate band beneath the bay
  rail: "#3f3327",
  // Airliner tones (for the 1960 crash-site marker).
  plane: "#d3d2cb", // silver/off-white fuselage
  planeDark: "#a7a79f", // shaded under-surfaces (wings, engines, tail)
  planeTrim: "#7d96a0", // muted steel-blue cheatline
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

/**
 * The brownstone at 640 2nd Street (where Obama lived in 1984), drawn from the
 * real facade: a warm terra-cotta three-story rowhouse whose signature is a
 * full-height bowed bay window (parlor, 2nd, 3rd floors) with two windows per
 * floor on its curved front and a carved foliate band at its base, capped by a
 * bracketed cornice. The entrance sits to the right of the bay, reached by a
 * high stoop, with a window above it on each upper floor and a garden-level
 * iron gate tucked beside the stoop.
 */
function brownstone(): BuildingDrawing {
  const FW = 64; // facade width
  const parts: BuildingPart[] = [];

  let seed = 80;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical bands (three stories over a garden level; the bay rises the full
  // height, straight from the cornice down to the carved band — no flat top
  // floor, matching the real house).
  const yCorTop = 0;
  const yCorBot = 12; // bracketed cornice
  const yBayTop = yCorBot; // the bay begins right under the cornice
  const yF3 = 18; // bay 3rd (top) floor
  const yF2 = 62; // bay 2nd floor
  const yP = 106; // bay parlor floor
  const hBay = 30; // upper-floor window height
  const hParlor = 34; // taller parlor windows
  const yBand = 146; // carved foliate band beneath the bay
  const hBand = 11;
  const yBase = yBand + hBand; // garden base course (=157)
  const yWater = 190; // sidewalk

  // Bay geometry (left ~two-thirds of the front; the entrance is to its right).
  const bayL = 2;
  const bayR = 44;
  const ret = 8; // foreshortened curved side ("return") width
  const frontL = bayL + ret; // 10
  const frontR = bayR - ret; // 36

  // Entrance geometry (right side).
  const dX = 47;
  const dW = 14;
  const dTop = yP - 2;
  const dBot = 152; // parlor landing / top of stoop

  // --- helpers ---
  // A band whose top & bottom edges bow downward, reading as a curved bay face.
  const bowBand = (x0: number, x1: number, y: number, h: number, dip: number): string => {
    const mx = (x0 + x1) / 2;
    return (
      `M ${r(x0)} ${r(y)} Q ${r(mx)} ${r(y + dip)} ${r(x1)} ${r(y)} ` +
      `L ${r(x1)} ${r(y + h)} Q ${r(mx)} ${r(y + h + dip)} ${r(x0)} ${r(y + h)} Z`
    );
  };
  // A simple paned window (no heavy surround), for the grouped bay openings.
  const win = (x: number, y: number, w: number, h: number, sw = 1.1) => {
    push({ d: rect(x, y, w, h), fill: C.glass, stroke: C.ink, strokeWidth: sw, roughness: 0.6, bowing: 0.4, fillStyle: "solid" });
    push({ d: `M ${r(x + w / 2)} ${r(y)} L ${r(x + w / 2)} ${r(y + h)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.5 });
    push({ d: `M ${r(x)} ${r(y + h / 2)} L ${r(x + w)} ${r(y + h / 2)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.5 });
  };
  // A sash window with a stone lintel + sill (flat-wall openings).
  const sash = (x: number, y: number, w: number, h: number) => {
    push({ d: rect(x - 1.5, y - 4, w + 3, 4), fill: C.brownTrim, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    win(x, y, w, h, 1.2);
    push({ d: rect(x - 1, y + h, w + 2, 2.5), fill: C.brownDark, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  };

  // Ground shadow first, so the house sits on top of it.
  push({
    d: ellipse(FW / 2, yWater + 2, FW * 0.62, 8),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Main (flat) brownstone wall.
  push({
    d: rect(0, yCorBot, FW, yWater - yCorBot),
    fill: C.brown,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    bowing: 0.6,
    fillStyle: "solid",
  });

  // Garden-level base course (deeper shade, with score lines).
  push({
    d: rect(0, yBase, FW, yWater - yBase),
    fill: C.brownDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  for (const yy of [yBase + 9, yBase + 18]) {
    push({ d: `M ${r(2)} ${r(yy)} L ${r(FW - 2)} ${r(yy)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7 });
  }

  // Bracketed cornice along the top.
  push({
    d: rect(-4, yCorTop, FW + 8, yCorBot - yCorTop),
    fill: C.brownTrim,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 0.9,
    fillStyle: "solid",
  });
  for (const x of spread(0, FW, 6, 3)) {
    push({ d: rect(x, yCorBot - 1, 3, 4), fill: C.brownDark, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }

  // Entrance-side windows on the upper floors (right of the bay).
  sash(48, yF3, 12, hBay);
  sash(48, yF2, 12, hBay);

  // --- The projecting bowed bay (parlor, 2nd, 3rd floors) ---
  // Side "returns" first (shaded), then the lit front face over them.
  push({
    d: `M ${r(bayL)} ${r(yBayTop + 3)} L ${r(frontL)} ${r(yBayTop)} L ${r(frontL)} ${r(yBand)} L ${r(bayL)} ${r(yBand)} Z`,
    fill: C.brownMid,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(frontR)} ${r(yBayTop)} L ${r(bayR)} ${r(yBayTop + 3)} L ${r(bayR)} ${r(yBand)} L ${r(frontR)} ${r(yBand)} Z`,
    fill: C.brownDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: rect(frontL, yBayTop, frontR - frontL, yBand - yBayTop),
    fill: C.brown,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 1,
    fillStyle: "solid",
  });
  // Curved cap band (the bay's own rounded cornice, just under the main one).
  push({
    d: bowBand(bayL, bayR, yBayTop - 2, 5, 3),
    fill: C.brownTrim,
    stroke: C.ink,
    strokeWidth: 1.1,
    roughness: 0.9,
    fillStyle: "solid",
  });

  // Bay openings: two windows per floor on the curved front, with a carved
  // spandrel band beneath each floor.
  for (const ty of [yF3, yF2, yP]) {
    const h = ty === yP ? hParlor : hBay;
    win(frontL + 2, ty, 10, h); // front-left
    win(frontL + 14, ty, 10, h); // front-right
    push({
      d: bowBand(bayL + 1, bayR - 1, ty + h + 2, 3, 2),
      fill: C.brownMid,
      stroke: C.ink,
      strokeWidth: 0.8,
      roughness: 0.8,
      fillStyle: "solid",
    });
  }

  // Carved foliate band at the base of the parlor bay (the showpiece course).
  push({
    d: bowBand(bayL, bayR, yBand, hBand, 4),
    fill: C.carve,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 0.9,
    fillStyle: "solid",
  });
  for (const x of spread(bayL + 3, bayR - 3, 7, 2)) {
    push({ d: rect(x, yBand + 4, 2, 5), fill: C.brownDark, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }

  // --- Entrance (right), recessed under a stone surround with a transom ---
  push({
    d: rect(dX - 3, dTop - 5, dW + 6, dBot - dTop + 5),
    fill: C.brownTrim,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 0.9,
    fillStyle: "solid",
  });
  push({ d: rect(dX, dTop, dW, 6), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" }); // transom
  push({
    d: rect(dX, dTop + 6, dW, dBot - dTop - 6),
    fill: C.door,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 0.9,
    fillStyle: "solid",
  });
  push({ d: `M ${r(dX + dW / 2)} ${r(dTop + 8)} L ${r(dX + dW / 2)} ${r(dBot - 1)}`, stroke: C.stone, strokeWidth: 0.7, roughness: 0.7 });

  // Garden-level iron gate, tucked beneath the bay to the left of the stoop.
  const gX = 8;
  const gW = 16;
  push({ d: rect(gX, yBase + 2, gW, yWater - yBase - 3), fill: C.brownDark, stroke: C.ink, strokeWidth: 1.1, roughness: 0.9, fillStyle: "solid" });
  for (const x of spread(gX, gX + gW, 4, 1)) {
    push({ d: `M ${r(x)} ${r(yBase + 4)} L ${r(x)} ${r(yWater - 3)}`, stroke: C.rail, strokeWidth: 0.9, roughness: 0.7 });
  }

  // --- High stoop: rises from the sidewalk up to the entrance landing ---
  const sxL = 28; // left foot of the stoop
  push({
    d:
      `M ${r(sxL)} ${r(yWater)} L ${r(sxL)} ${r(yWater - 5)} ` +
      `L ${r(dX - 1)} ${r(dBot)} L ${r(FW)} ${r(dBot)} ` +
      `L ${r(FW)} ${r(yWater)} Z`,
    fill: C.brownTrim,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 1,
    fillStyle: "solid",
  });
  const steps = 7;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = sxL + (dX - 1 - sxL) * t;
    const y = yWater - 5 + (dBot - (yWater - 5)) * t;
    push({ d: `M ${r(x)} ${r(y)} L ${r(x)} ${r(yWater)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7 });
  }
  // Stoop railing: a rail from the bottom newel up to the landing, on two posts.
  push({ d: rect(sxL - 1, yWater - 15, 3, 15), fill: C.rail, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(dX - 2, dBot - 17, 3, 17), fill: C.rail, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(sxL)} ${r(yWater - 13)} L ${r(dX - 1)} ${r(dBot - 15)}`, stroke: C.rail, strokeWidth: 1.6, roughness: 0.9 });

  return {
    width: FW,
    height: yWater + 4,
    anchorX: FW / 2,
    anchorY: yWater,
    scale: 0.4,
    parts,
  };
}

/**
 * A side-view four-engine airliner (a DC-8), used to mark the site of the
 * December 16, 1960 mid-air collision at Sterling Place & Seventh Avenue rather
 * than a building. Nose to the left, banking gently, with a faint ground shadow.
 */
function airliner(): BuildingDrawing {
  const W = 132;
  const H = 70;
  const parts: BuildingPart[] = [];

  let seed = 140;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const cy = 28; // fuselage centerline

  // Faint ground shadow / impact marker.
  push({
    d: ellipse(W / 2, H - 3, 42, 6),
    fill: "rgba(91,74,58,0.18)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.7,
    fillStyle: "solid",
  });

  // Main wing, swept back beneath the belly (shaded under-surface).
  push({
    d: `M 44 33 L 96 52 L 110 52 L 62 33 Z`,
    fill: C.planeDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  // Engine pods slung under the wing, intake rings facing forward (left).
  for (const [ex, ey] of [[70, 45], [88, 49]] as const) {
    push({ d: rect(ex, ey, 13, 5), fill: C.planeDark, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    push({ d: ellipse(ex + 0.5, ey + 2.5, 1.6, 2.6), fill: C.ink, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }

  // Vertical stabilizer (tail fin).
  push({
    d: `M 96 ${cy - 6} L 112 2 L 122 5 L 118 ${cy - 2} Z`,
    fill: C.planeDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });

  // Fuselage (drawn over the wing roots and fin base for a clean join).
  push({
    d:
      `M 16 ${cy - 7} Q 6 ${cy - 5} 6 ${cy} Q 6 ${cy + 5} 16 ${cy + 7} ` +
      `L 100 ${cy + 7} Q 116 ${cy + 7} 128 ${cy} ` +
      `Q 116 ${cy - 7} 100 ${cy - 7} Z`,
    fill: C.plane,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 0.8,
    bowing: 0.5,
    fillStyle: "solid",
  });

  // Horizontal stabilizer near the tail cone.
  push({
    d: `M 104 ${cy + 3} L 124 ${cy + 6} L 116 ${cy + 9} L 102 ${cy + 6} Z`,
    fill: C.planeDark,
    stroke: C.ink,
    strokeWidth: 1,
    roughness: 0.9,
    fillStyle: "solid",
  });

  // Cheatline along the fuselage.
  push({ d: `M 10 ${cy + 1} L 122 ${cy + 1}`, stroke: C.planeTrim, strokeWidth: 2.2, roughness: 0.6 });

  // Cabin windows.
  for (const x of spread(22, 98, 13, 2)) {
    push({ d: rect(x, cy - 4, 2, 3), fill: C.glass, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }
  // Cockpit window at the nose.
  push({
    d: `M 9 ${cy - 3} L 16 ${cy - 4} L 16 ${cy - 1} L 10 ${cy} Z`,
    fill: C.glass,
    stroke: C.ink,
    strokeWidth: 0.8,
    roughness: 0.7,
    fillStyle: "solid",
  });

  return { width: W, height: H, anchorX: W / 2, anchorY: H - 3, scale: 0.4, parts };
}

export type BuildingBuilder = () => BuildingDrawing;

/** Registry of POI building illustrations, keyed by the feature's `building`. */
export const BUILDINGS: Record<string, BuildingBuilder> = {
  "montauk-club": montaukClub,
  "obama-brownstone": brownstone,
  "plane-crash": airliner,
};
