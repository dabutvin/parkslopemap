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
  // Litchfield Villa tones (the buff Italianate mansion in Prospect Park).
  villa: "#c9a571", // lit buff stucco wall
  villaDark: "#a3814d", // shaded returns / curved tower side
  villaTrim: "#ecdcb4", // light stone cornices, quoins, hood molds
  balus: "#d8c499", // terrace balustrade stone
  recess: "#5e4d3a", // shadowed arcade / open verandah openings
  // Civic-monument tones (Grand Army Plaza: the Memorial Arch + the Library).
  granite: "#cdbd9c", // warm grey granite ashlar
  graniteDark: "#aa9974", // shaded granite returns / mouldings
  pgranite: "#cda58a", // polished Milford-pink granite (the Lafayette stele)
  pgraniteDark: "#a87f66", // shaded pink-granite return / lower mouldings
  bronze: "#7c7b54", // weathered-bronze statuary (the quadriga, pier groups)
  bronzeDark: "#565638", // deep bronze shade
  gold: "#c8a23c", // gilded entrance screen / inscriptions
  goldDark: "#9a7a22", // shaded gilding
  // Church tones (the three Park Slope landmark churches).
  lime: "#d9cba6", // light Indiana-limestone ashlar (Old First)
  limeDark: "#bdab82", // shaded limestone returns / spire facet
  bstone: "#9b6240", // warm rough-faced brownstone wall (St. Augustine / Memorial)
  bstoneDark: "#724631", // deep brownstone shade
  bstoneTrim: "#b9835a", // dressed-stone copings, hoodmolds, sills
  belleville: "#9a9188", // grey-brown Belleville ashlar (Memorial Presbyterian)
  bellevilleDark: "#706860", // shaded ashlar returns / buttresses
  bellevilleTrim: "#b5aba0", // dressed copings, hoodmolds, quatrefoil band
  slate: "#5f5e63", // blue-grey slate roof
  slateDark: "#46454a", // shaded slate slope
  // Carnegie-library tones (the 1906 Park Slope Branch: red brick + limestone).
  brick: "#a85d44", // lit red-brick wall
  brickDark: "#854a36", // shaded brick / right return
  // Wildflower tones (the Long Meadow marker — a little golden meadow flower).
  petal: "#e7b34c", // lit golden petal
  petalDark: "#c4892b", // petal shade / outline
  bloomCenter: "#7c4f2f", // brown seed disc
  bloomCenterDark: "#5d3a22", // disc shade
  stem: "#5f7a45", // green stem
  leaf: "#86a85d", // lit leaf
  // Dog Beach tones (a friendly golden retriever on the sandy shore).
  dogFur: "#d4a85c", // warm golden coat
  dogFurDark: "#b08840", // ears / shading
  dogChest: "#e8c078", // lighter chest
  dogNose: "#5b4a3a",
  dogTongue: "#c87070",
  ball: "#d4bc3a", // tennis ball at its feet
  ballSeam: "rgba(255,255,255,0.75)",
  sand: "#dcc89a", // sandy shore
  sandDark: "#b8a476", // damp sand / edge
  // Brooklyn Botanic Garden tones (an abstract flowering bed + cherry branches).
  gPink: "#ecaac0", // cherry-blossom pink bloom
  gPinkDark: "#cd7f9c",
  gLilac: "#b9a6da", // mixed border blooms
  gLilacDark: "#9a85bf",
  gCoral: "#e89368",
  gCoralDark: "#c96f43",
  gGold: "#ecc257",
  gGoldDark: "#cf982f",
  gCenter: "#f5e08a", // warm flower center
  gLeaf: "#8fb061", // planted mound green
  gLeafDark: "#6c8a45",
  gLeafDeep: "#4f6a37", // shaded base of the bed
  gTwig: "#7c5a3a", // bare cherry branch
  // Boathouse tones (the 1905 white glazed-terra-cotta pavilion on the Lullwater).
  bhouse: "#e9e1cb", // lit cream terra-cotta
  bhouseDark: "#cdc1a0", // shaded returns / cornice underside
  bhouseTrim: "#f4efe0", // bright balusters / highlights
  water: "#9fb7ac", // Lullwater green-blue
  waterDark: "#83a094", // shaded ripples
  // Endale Arch tones (the 1860s banded-stone tunnel into the Long Meadow).
  berea: "#dcc079", // lit yellow Berea sandstone course
  bereaDark: "#bb9d4f", // shaded sandstone / voussoir return
  endaleHill: "#8fa95f", // planted hillside over the tunnel
  endaleHillDark: "#6c8746", // shaded hill / shrub
  warmGlow: "#cf9a61", // restored wood-lined glow deep in the vault
  // Prospect Park Zoo tones (1935 WPA sea-lion court + red-brick pavilions).
  zooStone: "#e8e0cc", // limestone trim / dome
  zooStoneDark: "#c8baa0", // shaded ashlar / coping
  zooDeco: "#5a8a82", // glazed-tile deco accents
  zooDecoDark: "#3f6a63",
  seaLion: "#9a9186", // lit sea-lion hide
  seaLionDark: "#6f6760", // shaded folds / flippers
  seaLionBelly: "#b5aca2",
  zooRock: "#aa9974", // granite boulder in the pool
  zooRockDark: "#877960",
  zooFence: "#4a4038", // wrought-iron pool railing
  // Cronyn House tones (271 Ninth St.: sky-blue stucco, grey bays/porch, orange trim).
  cronynBlue: "#7ebfd4",
  cronynBlueDark: "#5a9fb8",
  cronynGrey: "#a59a92",
  cronynGreyDark: "#827870",
  cronynOrange: "#e07828",
  // Barclays Center tones (2012 SHoP weathering-steel arena at Atlantic Yards).
  corten: "#9a6848",
  cortenDark: "#6f452c",
  cortenLight: "#b88462",
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

/** A pointed (lancet / two-centred Gothic) arched opening, flat at the bottom. */
function lancet(left: number, topY: number, w: number, h: number): string {
  const cx = left + w / 2;
  const right = left + w;
  const rad = w; // a wide radius gives a tall, sharp Gothic point
  const spring = topY + w * 0.85;
  const bot = topY + h;
  return (
    `M ${r(left)} ${r(bot)} L ${r(left)} ${r(spring)} ` +
    `A ${r(rad)} ${r(rad)} 0 0 1 ${r(cx)} ${r(topY)} ` +
    `A ${r(rad)} ${r(rad)} 0 0 1 ${r(right)} ${r(spring)} ` +
    `L ${r(right)} ${r(bot)} Z`
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
    scale: 0.36,
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

/**
 * The Old Stone House (the 1699 Vechte-Cortelyou House, reconstructed 1934),
 * drawn from the 1940 HABS photo: a two-story rubble-fieldstone farmhouse seen
 * in three-quarter view. A steep side-gable roof runs front-to-back with a
 * brick gable end on the shaded right return, a tall brick chimney at each end
 * of the ridge, three shuttered windows on the upper floor, and an off-center
 * door flanked by windows on the ground floor.
 */
function oldStoneHouse(): BuildingDrawing {
  const FW = 94; // long (front) facade width
  const DX = 17; // shaded right-return depth (the gable end)
  const parts: BuildingPart[] = [];

  let seed = 200;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical bands (top-down).
  const yRidge = 12; // roof ridge
  const yEave = 52; // eaves: roof meets the front wall
  const yBase = 150; // bottom of the two-story stone wall
  const yWater = 156; // base course / sidewalk
  const apex = FW + DX / 2; // gable-end peak (x), over the return

  // A paned window with a stone lintel and a pair of board shutters.
  const shuttered = (x: number, y: number, w: number, h: number) => {
    push({ d: rect(x - 1.5, y - 4, w + 3, 4), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" }); // lintel
    push({ d: rect(x - 4.5, y, 3.5, h), fill: C.wallDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.9, fillStyle: "solid" }); // left shutter
    push({ d: rect(x + w + 1, y, 3.5, h), fill: C.wallDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.9, fillStyle: "solid" }); // right shutter
    push({ d: rect(x, y, w, h), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(x + w / 2)} ${r(y)} L ${r(x + w / 2)} ${r(y + h)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7 });
    push({ d: `M ${r(x)} ${r(y + h / 2)} L ${r(x + w)} ${r(y + h / 2)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7 });
  };

  // Ground shadow first, so the house sits on top of it.
  push({
    d: ellipse(FW / 2 + 5, yWater + 2, FW * 0.66, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Two brick chimneys, one at each end of the ridge (drawn first so the roof
  // overlaps their bases and they read as poking through it).
  const chimney = (cx: number) => {
    push({ d: rect(cx - 5, 0, 10, yEave), fill: C.chimney, stroke: C.ink, strokeWidth: 1.1, roughness: 1, fillStyle: "solid" });
    push({ d: rect(cx - 6.5, 0, 13, 4), fill: C.chimneyCap, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  };
  chimney(20);
  chimney(FW - 14);

  // Shaded stone wall return (the building's east side).
  push({
    d: `M ${r(FW)} ${r(yEave)} L ${r(FW + DX)} ${r(yEave + 9)} ` +
      `L ${r(FW + DX)} ${r(yWater - 2)} L ${r(FW)} ${r(yWater)} Z`,
    fill: C.stoneDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });

  // Brick gable end sitting on the return wall, apex at the ridge.
  push({
    d: `M ${r(FW)} ${r(yEave)} L ${r(apex)} ${r(yRidge)} L ${r(FW + DX)} ${r(yEave + 9)} Z`,
    fill: C.chimney,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });

  // Main two-story rubble-stone front wall.
  push({
    d: rect(0, yEave, FW, yBase - yEave),
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1.1,
    bowing: 0.6,
    fillStyle: "solid",
  });

  // Front roof slope (a steep gable plane), overhanging the eaves and the
  // chimney bases. Drawn over the wall top so the eave line is crisp.
  push({
    d: rect(-5, yRidge, FW + 5, yEave - yRidge + 3),
    fill: C.roof,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 1,
    bowing: 0.4,
    fillStyle: "solid",
  });
  // Ridge line + a short cap across to the gable apex.
  push({ d: `M ${r(-5)} ${r(yRidge)} L ${r(apex)} ${r(yRidge)}`, stroke: C.roofDark, strokeWidth: 2, roughness: 0.8 });
  // Rake along the gable's front slope (the roof edge over the brick gable).
  push({ d: `M ${r(FW)} ${r(yEave)} L ${r(apex)} ${r(yRidge)}`, stroke: C.roofDark, strokeWidth: 2.4, roughness: 0.8 });

  // Rubble-stone texture: a few uneven coursing lines + scattered joints.
  for (const yy of [yEave + 22, yEave + 48, yEave + 74]) {
    push({ d: `M ${r(4)} ${r(yy)} L ${r(FW - 4)} ${r(yy)}`, stroke: C.stoneDark, strokeWidth: 0.8, roughness: 1.4, bowing: 1 });
  }
  const joints = [
    [18, yEave + 10], [46, yEave + 8], [72, yEave + 12],
    [10, yEave + 34], [38, yEave + 35], [64, yEave + 33],
    [26, yEave + 60], [54, yEave + 61], [80, yEave + 59],
  ] as const;
  for (const [jx, jy] of joints) {
    push({ d: `M ${r(jx)} ${r(jy)} L ${r(jx)} ${r(jy + 8)}`, stroke: C.stoneDark, strokeWidth: 0.7, roughness: 1.2 });
  }

  // Water table / base course (a slightly wider stone plinth).
  push({
    d: rect(-2, yBase, FW + 4, yWater - yBase + 2),
    fill: C.stoneDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });

  // Upper floor: three shuttered windows.
  const upW = 13;
  const upY = yEave + 18;
  for (const x of spread(6, FW - 6, 3, upW)) shuttered(x, upY, upW, 20);

  // Ground floor: an off-center door flanked by windows.
  const dW = 15;
  const dX = 16;
  const dTop = yBase - 44;
  push({ d: rect(dX - 2.5, dTop - 5, dW + 5, 5), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" }); // lintel
  push({ d: rect(dX, dTop, dW, yBase - dTop), fill: C.door, stroke: C.ink, strokeWidth: 1.4, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(dX + dW / 2)} ${r(dTop + 3)} L ${r(dX + dW / 2)} ${r(yBase)}`, stroke: C.stone, strokeWidth: 0.7, roughness: 0.7 }); // door split
  const loY = yBase - 34;
  shuttered(46, loY, 13, 24);
  shuttered(72, loY, 13, 24);

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
 * Litchfield Villa / Grace Hill (1854–1857, Alexander Jackson Davis), the great
 * Italianate mansion that stands inside Prospect Park. Drawn as Davis's
 * picturesque, asymmetrical composition: a tall slender round campanile-turret
 * on the left, a square entrance tower beside it, and a lower main block on the
 * right fronted by an open arcaded verandah — all in buff stucco with bracketed
 * cornices, round-arched windows, and the low terrace wall that sets it off.
 * Heights cascade left→right (turret tallest, then square tower, then block).
 */
function litchfieldVilla(): BuildingDrawing {
  const parts: BuildingPart[] = [];

  let seed = 260;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical reference lines (top-down).
  const yWater = 196; // sidewalk
  const yBase = 188; // top of the terrace wall / base course
  const DX = 10; // shaded right-return depth on the main block

  // Round campanile-turret (far left, tall & slender — the signature).
  const tCx = 18;
  const tRad = 11;
  const tL = tCx - tRad; // 7
  const tR = tCx + tRad; // 29
  const tCapBot = 18; // base of the conical cap
  const tRing = tCapBot + 3;

  // Square entrance tower (middle).
  const sL = 30;
  const sR = 62;
  const sCx = (sL + sR) / 2; // 46
  const sRoofApex = 24;
  const sCorTop = 40;
  const sCorBot = 48;

  // Main block (right).
  const mL = 60;
  const mR = 118;
  const mCorTop = 64;
  const mCorBot = 74;

  // Ground shadow first, so the villa sits on top of it.
  push({
    d: ellipse((tL + mR + DX) / 2, yWater + 2, ((mR + DX) - tL) / 2 + 4, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Main block: shaded right return for mass.
  push({
    d: `M ${r(mR)} ${r(mCorTop)} L ${r(mR + DX)} ${r(mCorTop + 7)} ` +
      `L ${r(mR + DX)} ${r(yWater - 3)} L ${r(mR)} ${r(yWater)} Z`,
    fill: C.villaDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });

  // --- Walls (back-to-front) ---
  push({
    d: rect(mL, mCorTop, mR - mL, yWater - mCorTop),
    fill: C.villa,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    bowing: 0.6,
    fillStyle: "solid",
  });
  push({
    d: rect(sL, sCorTop, sR - sL, yWater - sCorTop),
    fill: C.villa,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 1,
    fillStyle: "solid",
  });
  // Round turret shaft, with a darker band on its right to read as curvature.
  push({
    d: rect(tL, tCapBot, tR - tL, yWater - tCapBot),
    fill: C.villa,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: rect(tR - 5, tCapBot, 5, yBase - tCapBot),
    fill: C.villaDark,
    stroke: "none",
    strokeWidth: 0,
    roughness: 1,
    fillStyle: "solid",
  });

  // --- Roofs / caps (drawn over the shaft tops) ---
  // Low hipped roof over the main block.
  push({
    d: `M ${r(mL)} ${r(mCorTop)} L ${r(mR)} ${r(mCorTop)} ` +
      `L ${r(mR - 12)} ${r(mCorTop - 10)} L ${r(mL + 12)} ${r(mCorTop - 10)} Z`,
    fill: C.roof,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 1,
    fillStyle: "solid",
  });
  // Square tower pyramidal roof (darker right slope for depth).
  push({
    d: `M ${r(sL - 2)} ${r(sCorTop)} L ${r(sCx)} ${r(sRoofApex)} L ${r(sR + 2)} ${r(sCorTop)} Z`,
    fill: C.roof,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(sCx)} ${r(sRoofApex)} L ${r(sR + 2)} ${r(sCorTop)} L ${r(sCx)} ${r(sCorTop)} Z`,
    fill: C.roofDark,
    stroke: "none",
    strokeWidth: 0,
    roughness: 1,
    fillStyle: "solid",
  });
  // Turret conical cap + finial.
  push({
    d: `M ${r(tL)} ${r(tCapBot)} L ${r(tCx)} ${r(0)} L ${r(tR)} ${r(tCapBot)} Z`,
    fill: C.roof,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(tCx)} ${r(0)} L ${r(tCx)} ${r(-5)}`,
    stroke: C.ink,
    strokeWidth: 1.1,
    roughness: 0.7,
  });

  // --- Cornices (bracketed) ---
  push({
    d: rect(mL - 3, mCorTop, mR - mL + 6 + DX, mCorBot - mCorTop),
    fill: C.villaTrim,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 0.9,
    fillStyle: "solid",
  });
  for (const x of spread(mL, mR, 8, 3)) {
    push({ d: rect(x, mCorBot - 1, 3, 3), fill: C.villaDark, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }
  push({
    d: rect(sL - 2, sCorTop, sR - sL + 4, sCorBot - sCorTop),
    fill: C.villaTrim,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 0.9,
    fillStyle: "solid",
  });
  for (const x of spread(sL, sR, 5, 3)) {
    push({ d: rect(x, sCorBot - 1, 3, 3), fill: C.villaDark, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }
  // Turret ring cornice under the cap.
  push({
    d: rect(tL - 1, tCapBot, tR - tL + 2, tRing - tCapBot),
    fill: C.villaTrim,
    stroke: C.ink,
    strokeWidth: 1.1,
    roughness: 0.9,
    fillStyle: "solid",
  });

  // --- Quoins on the square entrance tower ---
  for (let y = sCorBot + 2; y < yBase - 6; y += 14) {
    push({ d: rect(sL - 1, y, 4, 7), fill: C.villaTrim, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
    push({ d: rect(sR - 3, y, 4, 7), fill: C.villaTrim, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }

  // --- Turret openings: two small belvedere arches, then a slot window ---
  for (const x of spread(tL + 1, tR - 1, 2, 6)) {
    push({ d: archWindow(x, tRing + 5, 6, 14), fill: C.recess, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  }
  push({ d: archWindow(tCx - 4, tRing + 40, 8, 22), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  push({ d: archWindow(tCx - 4, tRing + 80, 8, 22), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });

  // --- Square tower: tall belfry window high, entrance arch at the ground ---
  push({ d: archWindow(sCx - 6, sCorBot + 8, 12, 30), fill: C.glass, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
  const dW = 18;
  const dX = sCx - dW / 2;
  const dTop = yBase - 48;
  push({ d: archWindow(dX, dTop, dW, 48), fill: C.door, stroke: C.ink, strokeWidth: 1.5, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(sCx)} ${r(dTop + dW / 2)} L ${r(sCx)} ${r(yBase)}`, stroke: C.villaTrim, strokeWidth: 0.8, roughness: 0.7 });

  // --- Main block: upper-floor arched windows over an arcaded verandah ---
  const upW = 12;
  for (const x of spread(mL + 4, mR - 4, 3, upW)) {
    push({ d: archWindow(x, mCorBot + 12, upW, 30), fill: C.glass, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
    // Hood mold over each window.
    push({ d: archWindow(x - 1.5, mCorBot + 9, upW + 3, 6), fill: C.villaTrim, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  }
  // String course between the floors.
  push({ d: rect(mL - 1, mCorBot + 52, mR - mL + 2, 3), fill: C.villaTrim, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });

  // Open verandah: a porch cornice over a row of round-arched openings.
  const yArc = mCorBot + 60; // 134
  push({
    d: rect(mL - 2, yArc - 4, mR - mL + 4, 4),
    fill: C.villaTrim,
    stroke: C.ink,
    strokeWidth: 1,
    roughness: 0.8,
    fillStyle: "solid",
  });
  for (const x of spread(mL + 2, mR - 2, 4, 10)) {
    push({ d: archWindow(x, yArc + 2, 10, yBase - yArc - 2), fill: C.recess, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  }

  // --- Terrace: a low balustraded wall across the whole front ---
  push({
    d: rect(tL - 2, yBase, (mR + DX) - tL + 2, yWater - yBase),
    fill: C.balus,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 0.9,
    fillStyle: "solid",
  });
  push({ d: `M ${r(tL - 3)} ${r(yBase)} L ${r(mR + DX + 1)} ${r(yBase)}`, stroke: C.ink, strokeWidth: 1, roughness: 0.7 });
  for (const x of spread(tL, mR + DX, 22, 1.5)) {
    push({ d: `M ${r(x)} ${r(yBase + 2)} L ${r(x)} ${r(yWater - 1)}`, stroke: C.villaDark, strokeWidth: 0.9, roughness: 0.6 });
  }

  return {
    width: mR + DX + 4,
    height: yWater + 6,
    anchorX: 66,
    anchorY: yWater,
    scale: 0.4,
    parts,
  };
}

/**
 * The Soldiers' and Sailors' Memorial Arch (1889–1892, John H. Duncan) at the
 * center of Grand Army Plaza: a granite triumphal arch dedicated to the Union
 * Army. Drawn as a single tall round-arched gate with a deep attic and cornice,
 * the two bronze sculptural groups (Army & Navy) at the pier bases, and — the
 * silhouette everyone knows — Frederick MacMonnies's bronze quadriga on top:
 * Victory in a chariot drawn by horses that prance outward to either side.
 */
function memorialArch(): BuildingDrawing {
  const W = 96;
  const parts: BuildingPart[] = [];

  let seed = 320;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical bands (top-down). The quadriga occupies the top zone, so the stone
  // arch is pushed down to leave room for it (kept >= 0, like Montauk's ROOF).
  const yAtticTop = 44; // top of the granite attic block
  const yCorTop = 66;
  const yCorBot = 76;
  const yOpenTop = 82; // crown of the arch opening
  const yBase = 158; // bottom of the piers
  const yWater = 166; // ground

  const L = 10;
  const R = 86; // pier outer edges
  const opL = 36;
  const opR = 60; // arch opening
  const opCx = (opL + opR) / 2; // 48
  const rad = (opR - opL) / 2; // 12
  const spring = yOpenTop + rad;

  // A weathered-bronze prancing horse, facing `dir` (-1 left, +1 right), with its
  // hooves at `footY` and its body centered on `cx`.
  const horse = (cx: number, footY: number, dir: 1 | -1) => {
    push({ d: ellipse(cx, footY - 9, 10, 6), fill: C.bronze, stroke: C.ink, strokeWidth: 1, roughness: 1, fillStyle: "solid" }); // barrel
    // Arched neck + wedge head reaching up and forward.
    const nx = cx + dir * 7;
    push({
      d:
        `M ${r(nx)} ${r(footY - 12)} ` +
        `Q ${r(nx + dir * 9)} ${r(footY - 24)} ${r(nx + dir * 15)} ${r(footY - 22)} ` +
        `L ${r(nx + dir * 12)} ${r(footY - 16)} Q ${r(nx + dir * 6)} ${r(footY - 14)} ${r(nx + dir * 4)} ${r(footY - 9)} Z`,
      fill: C.bronze,
      stroke: C.ink,
      strokeWidth: 1,
      roughness: 1,
      fillStyle: "solid",
    });
    // Hind legs planted, front legs raised (prancing).
    push({ d: `M ${r(cx - dir * 6)} ${r(footY - 6)} L ${r(cx - dir * 7)} ${r(footY)}`, stroke: C.bronzeDark, strokeWidth: 1.6, roughness: 0.9 });
    push({ d: `M ${r(cx - dir * 2)} ${r(footY - 6)} L ${r(cx - dir * 2)} ${r(footY)}`, stroke: C.bronzeDark, strokeWidth: 1.6, roughness: 0.9 });
    push({ d: `M ${r(cx + dir * 5)} ${r(footY - 8)} L ${r(cx + dir * 11)} ${r(footY - 5)}`, stroke: C.bronzeDark, strokeWidth: 1.5, roughness: 0.9 });
    push({ d: `M ${r(cx + dir * 4)} ${r(footY - 8)} L ${r(cx + dir * 9)} ${r(footY - 1)}`, stroke: C.bronzeDark, strokeWidth: 1.5, roughness: 0.9 });
    // Tail streaming off the rump.
    push({ d: `M ${r(cx - dir * 9)} ${r(footY - 13)} Q ${r(cx - dir * 15)} ${r(footY - 9)} ${r(cx - dir * 14)} ${r(footY - 2)}`, stroke: C.bronzeDark, strokeWidth: 1.4, roughness: 1 });
  };

  // Ground shadow first.
  push({
    d: ellipse(W / 2, yWater + 2, W * 0.52, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // --- Quadriga on top (bronze): horses prancing outward around Victory ---
  const plinthY = yAtticTop - 3;
  push({ d: rect(opCx - 26, plinthY, 52, 5), fill: C.graniteDark, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  horse(opCx - 13, plinthY, -1);
  horse(opCx + 13, plinthY, 1);
  // Victory: a winged figure standing at center, arms/standard raised.
  push({ d: `M ${r(opCx - 8)} ${r(plinthY - 8)} L ${r(opCx)} ${r(plinthY - 20)} L ${r(opCx)} ${r(plinthY - 6)} Z`, fill: C.bronzeDark, stroke: C.ink, strokeWidth: 0.8, roughness: 1, fillStyle: "solid" }); // left wing
  push({ d: `M ${r(opCx + 8)} ${r(plinthY - 8)} L ${r(opCx)} ${r(plinthY - 20)} L ${r(opCx)} ${r(plinthY - 6)} Z`, fill: C.bronze, stroke: C.ink, strokeWidth: 0.8, roughness: 1, fillStyle: "solid" }); // right wing
  push({ d: `M ${r(opCx - 2.5)} ${r(plinthY - 4)} L ${r(opCx + 2.5)} ${r(plinthY - 4)} L ${r(opCx + 1.5)} ${r(plinthY - 22)} L ${r(opCx - 1.5)} ${r(plinthY - 22)} Z`, fill: C.bronze, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" }); // torso
  push({ d: ellipse(opCx, plinthY - 24, 2.4, 2.8), fill: C.bronze, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" }); // head
  push({ d: `M ${r(opCx)} ${r(plinthY - 21)} L ${r(opCx + 12)} ${r(plinthY - 30)}`, stroke: C.bronzeDark, strokeWidth: 1.4, roughness: 0.8 }); // raised arm/standard

  // --- Granite arch ---
  push({ d: rect(L, yAtticTop, R - L, yBase - yAtticTop), fill: C.granite, stroke: C.ink, strokeWidth: 1.6, roughness: 1, bowing: 0.4, fillStyle: "solid" });
  // Attic top course.
  push({ d: rect(L - 2, yAtticTop, R - L + 4, 5), fill: C.graniteDark, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  // Inscription panel on the attic.
  push({ d: rect(L + 8, yAtticTop + 11, R - L - 16, 8), fill: C.graniteDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });

  // Bracketed cornice (overhangs).
  push({ d: rect(L - 5, yCorTop, R - L + 10, yCorBot - yCorTop), fill: C.granite, stroke: C.ink, strokeWidth: 1.5, roughness: 0.9, fillStyle: "solid" });
  for (const x of spread(L, R, 16, 3)) {
    push({ d: rect(x, yCorBot - 1, 3, 3), fill: C.graniteDark, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }

  // Arch opening: a lighter voussoir surround, then the deep recess and keystone.
  push({ d: archWindow(opL - 4, yOpenTop - 3, opR - opL + 8, yBase - (yOpenTop - 3)), fill: C.graniteDark, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  push({ d: archWindow(opL, yOpenTop, opR - opL, yBase - yOpenTop), fill: C.recess, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(opCx - 3.5)} ${r(spring - rad - 3)} L ${r(opCx + 3.5)} ${r(spring - rad - 3)} L ${r(opCx + 2.5)} ${r(spring - rad + 9)} L ${r(opCx - 2.5)} ${r(spring - rad + 9)} Z`, fill: C.granite, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" }); // keystone

  // Bronze sculptural groups at the pier bases (Army left, Navy right).
  for (const gx of [(L + opL) / 2, (opR + R) / 2]) {
    push({ d: ellipse(gx, yBase - 2, 11, 5), fill: C.bronzeDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
    push({ d: `M ${r(gx - 8)} ${r(yBase - 2)} Q ${r(gx - 6)} ${r(yBase - 24)} ${r(gx)} ${r(yBase - 24)} Q ${r(gx + 6)} ${r(yBase - 24)} ${r(gx + 8)} ${r(yBase - 2)} Z`, fill: C.bronze, stroke: C.ink, strokeWidth: 1, roughness: 1, fillStyle: "solid" });
    push({ d: ellipse(gx - 3, yBase - 25, 2, 2.4), fill: C.bronze, stroke: C.ink, strokeWidth: 0.6, roughness: 0.8, fillStyle: "solid" });
    push({ d: ellipse(gx + 3, yBase - 23, 1.8, 2.2), fill: C.bronze, stroke: C.ink, strokeWidth: 0.6, roughness: 0.8, fillStyle: "solid" });
  }

  // Plinth / steps the arch stands on.
  push({ d: rect(L - 7, yBase, R - L + 14, yWater - yBase), fill: C.graniteDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(L - 4)} ${r(yBase + 4)} L ${r(R + 4)} ${r(yBase + 4)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7 });

  return {
    width: W,
    height: yWater + 6,
    anchorX: W / 2,
    anchorY: yWater,
    scale: 0.4,
    parts,
  };
}

/**
 * The Bailey Fountain (1932, Egerton Swartwout & Eugene Savage) on the north side
 * of Grand Army Plaza — the third fountain to occupy the plaza's center. Drawn
 * as its signature silhouette: a circular rockwork basin with green-blue water,
 * bronze Nereids trumpeting from the sides, and the heroic ship-of-Life group
 * at center (Wisdom at the tiller, Felicity with her cornucopia).
 */
function baileyFountain(): BuildingDrawing {
  const W = 88;
  const parts: BuildingPart[] = [];

  let seed = 340;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const cx = W / 2; // 44
  const yBasinTop = 52;
  const yBasinBot = 88;
  const yPedTop = 34;
  const yPedBot = yBasinTop + 4;
  const yFigTop = 8;
  const yWater = 96;

  // Ground shadow first.
  push({
    d: ellipse(cx, yWater + 2, W * 0.48, 8),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Basin water (drawn before the coping so rocks sit on the rim).
  push({
    d: ellipse(cx, (yBasinTop + yBasinBot) / 2, 38, 18),
    fill: C.water,
    stroke: C.waterDark,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });
  // A few ripples across the pool.
  for (const [rx, ry, rw, rh] of [[cx - 10, yBasinTop + 14, 14, 3], [cx + 8, yBasinTop + 22, 12, 2.5], [cx, yBasinTop + 30, 16, 3]] as const) {
    push({ d: ellipse(rx, ry, rw, rh), fill: "none", stroke: C.waterDark, strokeWidth: 0.7, roughness: 0.9 });
  }

  // Rockwork coping ringing the basin.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + Math.cos(a) * 36;
    const by = (yBasinTop + yBasinBot) / 2 + Math.sin(a) * 16;
    push({
      d: ellipse(bx, by, 5 + (i % 3), 4 + (i % 2)),
      fill: i % 2 ? C.granite : C.graniteDark,
      stroke: C.ink,
      strokeWidth: 0.8,
      roughness: 1.2,
      fillStyle: "solid",
    });
  }

  // Side Nereids emerging from the water, heads thrown back with conch shells.
  const nereid = (nx: number, dir: 1 | -1) => {
    push({
      d: `M ${r(nx)} ${r(yBasinTop + 10)} Q ${r(nx + dir * 8)} ${r(yBasinTop + 2)} ${r(nx + dir * 5)} ${r(yBasinTop - 6)}`,
      fill: C.bronze,
      stroke: C.ink,
      strokeWidth: 1.1,
      roughness: 1,
      fillStyle: "solid",
    });
    push({ d: ellipse(nx + dir * 5, yBasinTop - 8, 3.2, 3.6), fill: C.bronze, stroke: C.ink, strokeWidth: 0.8, roughness: 0.9, fillStyle: "solid" }); // head
    // Conch shell raised to lips.
    push({
      d: `M ${r(nx + dir * 8)} ${r(yBasinTop - 10)} Q ${r(nx + dir * 14)} ${r(yBasinTop - 16)} ${r(nx + dir * 12)} ${r(yBasinTop - 8)}`,
      stroke: C.bronzeDark,
      strokeWidth: 1.6,
      roughness: 1,
      bowing: 1.2,
    });
    // Fish tail curling in the water.
    push({
      d: `M ${r(nx - dir * 2)} ${r(yBasinTop + 16)} Q ${r(nx + dir * 10)} ${r(yBasinTop + 24)} ${r(nx + dir * 16)} ${r(yBasinTop + 12)}`,
      stroke: C.bronzeDark,
      strokeWidth: 1.4,
      roughness: 1.1,
    });
  };
  nereid(cx - 28, -1);
  nereid(cx + 28, 1);

  // Central bronze pedestal / ship's prow rising from the basin.
  push({
    d: `M ${r(cx - 14)} ${r(yPedBot)} L ${r(cx)} ${r(yPedTop + 6)} L ${r(cx + 14)} ${r(yPedBot)} Z`,
    fill: C.bronzeDark,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: rect(cx - 10, yPedTop + 6, 20, yPedBot - yPedTop - 4),
    fill: C.bronze,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 0.9,
    fillStyle: "solid",
  });

  // Nereus / reclining sea figure at the prow base.
  push({ d: ellipse(cx, yPedTop + 14, 9, 4.5), fill: C.bronzeDark, stroke: C.ink, strokeWidth: 0.9, roughness: 1, fillStyle: "solid" });
  push({ d: ellipse(cx - 6, yPedTop + 12, 2.2, 2.6), fill: C.bronze, stroke: C.ink, strokeWidth: 0.7, roughness: 0.9, fillStyle: "solid" });

  // Standing figures atop the ship: Wisdom (left, at the tiller) and Felicity (right, cornucopia).
  const standingFigure = (fx: number, armDir: 1 | -1) => {
    push({ d: ellipse(fx, yFigTop + 4, 2.6, 3), fill: C.bronze, stroke: C.ink, strokeWidth: 0.7, roughness: 0.9, fillStyle: "solid" }); // head
    push({
      d: `M ${r(fx - 2.5)} ${r(yFigTop + 7)} L ${r(fx + 2.5)} ${r(yFigTop + 7)} L ${r(fx + 2)} ${r(yPedTop + 8)} L ${r(fx - 2)} ${r(yPedTop + 8)} Z`,
      fill: C.bronze,
      stroke: C.ink,
      strokeWidth: 0.9,
      roughness: 0.9,
      fillStyle: "solid",
    });
    push({ d: `M ${r(fx + armDir * 2)} ${r(yFigTop + 10)} L ${r(fx + armDir * 8)} ${r(yFigTop + 6)}`, stroke: C.bronzeDark, strokeWidth: 1.2, roughness: 0.8 });
  };
  standingFigure(cx - 5, -1);
  standingFigure(cx + 5, 1);

  // Water jets arcing up from the basin toward the central group.
  for (const [jx, jy, jdx, jdy] of [[cx - 18, yBasinTop + 8, cx - 8, yPedTop + 4], [cx + 18, yBasinTop + 8, cx + 8, yPedTop + 4], [cx, yBasinTop + 6, cx, yPedTop + 2]] as const) {
    push({
      d: `M ${r(jx)} ${r(jy)} Q ${r((jx + jdx) / 2)} ${r(jy - 10)} ${r(jdx)} ${r(jdy)}`,
      stroke: "rgba(159,183,172,0.7)",
      strokeWidth: 1.2,
      roughness: 1.2,
      bowing: 1.3,
    });
  }

  // Low terrace the fountain sits on.
  push({ d: rect(8, yBasinBot + 2, W - 16, yWater - yBasinBot - 2), fill: C.graniteDark, stroke: C.ink, strokeWidth: 1.1, roughness: 1, fillStyle: "solid" });

  return {
    width: W,
    height: yWater + 4,
    anchorX: cx,
    anchorY: yWater,
    scale: 0.38,
    parts,
  };
}

/**
 * The Brooklyn Public Library, Central Library (1941, Githens & Keally) at Grand
 * Army Plaza: a monumental Art Deco / Moderne limestone block whose curved
 * facade opens toward the plaza like a book. Drawn frontally as its signature
 * front: a low, near-blank limestone mass whose parapet sweeps in a great
 * concave curve down from a tall central frontispiece to lower flanking wings,
 * with one tall, narrow gilded entrance portal (gold figures over bronze doors)
 * at the center, a gilded inscription, and a low flight of entrance steps.
 */
function centralLibrary(): BuildingDrawing {
  const W = 160;
  const parts: BuildingPart[] = [];

  let seed = 380;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical reference lines (top-down). A low, monumental limestone mass: a
  // tall central frontispiece whose parapet sweeps concavely down to much lower
  // flanking wings, with one tall, narrow gilded entrance portal at center.
  const yWater = 150; // ground
  const yBase = 142; // top of the steps
  const pvTop = 14; // top of the central frontispiece (the tall part)
  const pvShoulder = 40; // where the curved parapet leaves the frontispiece
  const wingRoof = 66; // wing roofline at the outer ends (much lower)

  const L = 6;
  const R = 154;
  const pvL = 58; // frontispiece sides
  const pvR = 102;
  const pvTopL = 70; // flat-top span of the frontispiece
  const pvTopR = 90;
  const eL = 72; // tall gilded entrance portal
  const eR = 88;
  const eCx = (eL + eR) / 2; // 80
  const eTop = 44; // top of the portal opening

  // Ground shadow first.
  push({
    d: ellipse(W / 2, yWater + 2, W * 0.52, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Right wing first (slightly shaded — the side that curves away), its parapet
  // sweeping in a concave curve up to the frontispiece.
  push({
    d:
      `M ${r(pvR)} ${r(yBase)} L ${r(pvR)} ${r(pvShoulder)} ` +
      `C ${r(pvR + 10)} ${r(pvShoulder + 3)} ${r(R - 24)} ${r(wingRoof)} ${r(R)} ${r(wingRoof)} ` +
      `L ${r(R)} ${r(yBase)} Z`,
    fill: C.stoneDark,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    bowing: 0.3,
    fillStyle: "solid",
  });
  // Left wing (lit), the same concave parapet sweep.
  push({
    d:
      `M ${r(L)} ${r(yBase)} L ${r(L)} ${r(wingRoof)} ` +
      `C ${r(L + 24)} ${r(wingRoof)} ${r(pvL - 10)} ${r(pvShoulder + 3)} ${r(pvL)} ${r(pvShoulder)} ` +
      `L ${r(pvL)} ${r(yBase)} Z`,
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    bowing: 0.3,
    fillStyle: "solid",
  });

  // Central frontispiece (the tall block) with softly rounded upper shoulders.
  push({
    d:
      `M ${r(pvL)} ${r(yBase)} L ${r(pvL)} ${r(pvShoulder)} ` +
      `Q ${r(pvL)} ${r(pvTop)} ${r(pvTopL)} ${r(pvTop)} ` +
      `L ${r(pvTopR)} ${r(pvTop)} ` +
      `Q ${r(pvR)} ${r(pvTop)} ${r(pvR)} ${r(pvShoulder)} ` +
      `L ${r(pvR)} ${r(yBase)} Z`,
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    fillStyle: "solid",
  });
  // Soft shadow down the frontispiece's right edge, so it reads as projecting.
  push({ d: rect(pvR - 6, pvShoulder, 6, yBase - pvShoulder), fill: C.stoneDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });

  // A few faint ashlar joints across the otherwise blank limestone.
  for (const yy of [pvShoulder + 28, pvShoulder + 60, pvShoulder + 90]) {
    push({ d: `M ${r(pvL + 3)} ${r(yy)} L ${r(pvR - 3)} ${r(yy)}`, stroke: C.stoneDark, strokeWidth: 0.5, roughness: 0.7 });
  }

  // Narrow vertical slot windows flanking the portal (the spare fenestration).
  for (const x of [pvL + 5, pvR - 8]) {
    push({ d: rect(x, eTop + 4, 3, yBase - eTop - 18), fill: C.recess, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  }

  // Gilded inscription band on the frontispiece, just above the portal.
  push({ d: rect(eL - 8, eTop - 11, eR - eL + 16, 5), fill: C.gold, stroke: C.goldDark, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });

  // The tall gilded entrance portal: a gold screen of figures over bronze doors.
  push({ d: rect(eL, eTop, eR - eL, yBase - eTop), fill: C.gold, stroke: C.goldDark, strokeWidth: 1.4, roughness: 0.9, fillStyle: "solid" });
  for (const x of spread(eL, eR, 3, 1.2)) {
    push({ d: `M ${r(x)} ${r(eTop + 4)} L ${r(x)} ${r(yBase - 2)}`, stroke: C.goldDark, strokeWidth: 0.8, roughness: 0.6 });
  }
  // Two columns of small gilded relief figures climbing the screen.
  for (const fx of [eL + 2.5, eR - 4.9]) {
    for (let k = 0; k < 5; k++) {
      push({ d: rect(fx, eTop + 8 + k * 15, 2.4, 8), fill: C.goldDark, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
    }
  }
  // Bronze doors at the foot of the portal.
  push({ d: rect(eL + 1, yBase - 16, eR - eL - 2, 16), fill: C.recess, stroke: C.ink, strokeWidth: 1.1, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(eCx)} ${r(yBase - 16)} L ${r(eCx)} ${r(yBase)}`, stroke: C.gold, strokeWidth: 0.8, roughness: 0.7 });

  // Gilded inscription line along the lower right wing (as in the 1942 photo).
  push({ d: `M ${r(pvR + 9)} ${r(wingRoof + 20)} L ${r(R - 8)} ${r(wingRoof + 7)}`, stroke: C.gold, strokeWidth: 1.3, roughness: 0.6 });

  // Low entrance steps / plinth.
  push({ d: rect(L - 5, yBase, R - L + 10, yWater - yBase), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  for (const yy of [yBase + 3, yBase + 6]) {
    push({ d: `M ${r(L - 3)} ${r(yy)} L ${r(R + 3)} ${r(yy)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
  }

  return {
    width: W,
    height: yWater + 6,
    anchorX: W / 2,
    anchorY: yWater,
    scale: 0.32,
    parts,
  };
}

/**
 * Old First Reformed Church (1888–1893, George L. Morse), Seventh Avenue at
 * Carroll Street: a Late Gothic Revival church in light Indiana limestone whose
 * 212-foot stone steeple is the tallest in Brooklyn. Drawn as its signature
 * silhouette — a lower gabled nave on the left and, on the right, a slender
 * buttressed tower carrying an enormous needle spire that tapers to a point,
 * flanked by corner pinnacles, all in pale ashlar with tall lancet windows.
 */
function oldFirstReformed(): BuildingDrawing {
  const W = 122;
  const parts: BuildingPart[] = [];

  let seed = 440;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 258; // sidewalk
  const yBase = 251;

  // Tower (right) carrying the great needle spire.
  const tL = 66;
  const tR = 116;
  const tCx = (tL + tR) / 2; // 91
  const tTop = 96; // top of the belfry stage / base of the spire
  const spireApex = 2;

  // Nave (left), a lower gabled limestone front.
  const nL = 2;
  const nR = 64;
  const nCx = (nL + nR) / 2; // 33
  const naveShoulder = 130; // the gable springs here
  const naveApex = 86;

  // A small crocketed pinnacle of total height `h` rising to (cx, baseY - h).
  const pinnacle = (cx: number, baseY: number, h: number, w: number) => {
    const capH = h * 0.46;
    const shaftTop = baseY - (h - capH);
    push({ d: rect(cx - w / 2, shaftTop, w, h - capH), fill: C.lime, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
    push({ d: `M ${r(cx - w / 2)} ${r(shaftTop)} L ${r(cx)} ${r(baseY - h)} L ${r(cx + w / 2)} ${r(shaftTop)} Z`, fill: C.limeDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  };

  // Ground shadow first.
  push({ d: ellipse(W / 2, yWater + 2, W * 0.58, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // --- Nave gable front (drawn first; the tower overlaps its right edge) ---
  push({
    d: `M ${r(nL)} ${r(yBase)} L ${r(nL)} ${r(naveShoulder)} L ${r(nCx)} ${r(naveApex)} ` +
      `L ${r(nR)} ${r(naveShoulder)} L ${r(nR)} ${r(yBase)} Z`,
    fill: C.lime,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  // Gable rake coping.
  push({ d: `M ${r(nL - 1)} ${r(naveShoulder)} L ${r(nCx)} ${r(naveApex - 2)} L ${r(nR + 1)} ${r(naveShoulder)}`, stroke: C.limeDark, strokeWidth: 2, roughness: 0.8 });
  // Tall lancet window group in the gable.
  push({ d: lancet(nL + 12, naveShoulder - 30, nR - nL - 24, 88), fill: C.glass, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  for (const mx of [nCx - 9, nCx, nCx + 9]) {
    push({ d: `M ${r(mx)} ${r(naveShoulder - 14)} L ${r(mx)} ${r(yBase - 28)}`, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7 });
  }
  // Pointed entrance at the base.
  push({ d: lancet(nCx - 11, yBase - 34, 22, 34), fill: C.door, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(nCx)} ${r(yBase - 22)} L ${r(nCx)} ${r(yBase)}`, stroke: C.lime, strokeWidth: 0.7, roughness: 0.7 });
  // Nave corner buttress + pinnacle (left edge).
  push({ d: rect(nL - 3, naveShoulder + 6, 5, yBase - naveShoulder - 6), fill: C.limeDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  pinnacle(nL, naveShoulder + 6, 26, 7);

  // --- Tower ---
  push({ d: rect(tL, tTop, tR - tL, yBase - tTop), fill: C.lime, stroke: C.ink, strokeWidth: 1.6, roughness: 1, bowing: 0.4, fillStyle: "solid" });
  // Shaded right return for a touch of mass.
  push({ d: rect(tR - 6, tTop, 6, yBase - tTop), fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  // Stepped corner buttresses.
  push({ d: rect(tL - 3, tTop + 12, 5, yBase - tTop - 12), fill: C.limeDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(tR - 2, tTop + 12, 5, yBase - tTop - 12), fill: C.limeDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  // String courses.
  for (const yy of [tTop + 46, tTop + 96, tTop + 132]) {
    push({ d: `M ${r(tL - 2)} ${r(yy)} L ${r(tR + 2)} ${r(yy)}`, stroke: C.limeDark, strokeWidth: 1.2, roughness: 0.7 });
  }
  // Belfry: tall paired lancets near the top.
  push({ d: lancet(tCx - 15, tTop + 8, 13, 32), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
  push({ d: lancet(tCx + 2, tTop + 8, 13, 32), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
  // A single lancet mid-shaft.
  push({ d: lancet(tCx - 7, tTop + 60, 14, 30), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  // Deep pointed entrance portal at the base.
  push({ d: lancet(tCx - 15, yBase - 48, 30, 48), fill: C.door, stroke: C.ink, strokeWidth: 1.5, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(yBase - 30)} L ${r(tCx)} ${r(yBase)}`, stroke: C.lime, strokeWidth: 0.8, roughness: 0.7 });

  // --- The great needle spire (slender, rising from a small arcaded drum) ---
  const sBaseL = tCx - 13;
  const sBaseR = tCx + 13;
  // Blind arcade ringing the spire base (the lantern drum below the needle).
  for (const ax of spread(sBaseL - 3, sBaseR + 3, 4, 5)) {
    push({ d: lancet(ax, tTop - 8, 5, 9), fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }
  push({ d: `M ${r(sBaseL)} ${r(tTop)} L ${r(tCx)} ${r(spireApex)} L ${r(sBaseR)} ${r(tTop)} Z`, fill: C.lime, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  // Shaded right facet.
  push({ d: `M ${r(tCx)} ${r(spireApex)} L ${r(sBaseR)} ${r(tTop)} L ${r(tCx)} ${r(tTop)} Z`, fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(spireApex)} L ${r(tCx)} ${r(tTop)}`, stroke: C.limeDark, strokeWidth: 0.8, roughness: 0.7 });
  // Spire lucarnes (tiny gabled openings up the face).
  for (const ly of [tTop - 40, tTop - 16]) {
    const lw = ly < tTop - 28 ? 6 : 8;
    push({ d: `M ${r(tCx - lw / 2)} ${r(ly + 6)} L ${r(tCx)} ${r(ly)} L ${r(tCx + lw / 2)} ${r(ly + 6)} Z`, fill: C.limeDark, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7, fillStyle: "solid" });
  }
  // Pinnacles flanking the spire base.
  pinnacle(tL + 2, tTop + 4, 30, 8);
  pinnacle(tR - 2, tTop + 4, 30, 8);

  return { width: W, height: yWater + 6, anchorX: W / 2, anchorY: yWater, scale: 0.32, parts };
}

/**
 * St. Augustine's Roman Catholic Church (1888–1892, Parfitt Brothers), Sixth
 * Avenue at Sterling Place — "the Cathedral of Park Slope." A High Victorian
 * Gothic pile in rough-faced brownstone with steep slate roofs. Drawn from the
 * Sterling Place view: a tall gabled front with a great traceried window over a
 * deep pointed entrance porch, and, to the right, the massive square tower that
 * rises to a pale pyramidal steeple capped with a cross and ringed by corner
 * pinnacles.
 */
function stAugustine(): BuildingDrawing {
  const W = 152;
  const parts: BuildingPart[] = [];

  let seed = 540;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 226; // sidewalk
  const yBase = 219;

  // Tower (right) with its pale pyramidal steeple.
  const tL = 94;
  const tR = 144;
  const tCx = (tL + tR) / 2; // 119
  const tTop = 84; // top of the belfry stage / base of the steeple
  const steepleApex = 12;

  // Nave gable front (left/center).
  const nL = 6;
  const nR = 90;
  const nCx = (nL + nR) / 2; // 48
  const naveEave = 104; // steep slate roof springs here
  const naveApex = 42;

  const pinnacle = (cx: number, baseY: number, h: number, w: number) => {
    const capH = h * 0.5;
    const shaftTop = baseY - (h - capH);
    push({ d: rect(cx - w / 2, shaftTop, w, h - capH), fill: C.bstone, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
    push({ d: `M ${r(cx - w / 2)} ${r(shaftTop)} L ${r(cx)} ${r(baseY - h)} L ${r(cx + w / 2)} ${r(shaftTop)} Z`, fill: C.slateDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  };

  // Ground shadow first.
  push({ d: ellipse(W / 2, yWater + 2, W * 0.56, 10), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // --- Tower (drawn first; the nave roof tucks in front of its left edge) ---
  push({ d: rect(tL, tTop, tR - tL, yBase - tTop), fill: C.bstone, stroke: C.ink, strokeWidth: 1.6, roughness: 1.1, bowing: 0.4, fillStyle: "solid" });
  push({ d: rect(tR - 7, tTop, 7, yBase - tTop), fill: C.bstoneDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  // Corner buttresses.
  push({ d: rect(tL - 3, tTop + 14, 6, yBase - tTop - 14), fill: C.bstoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(tR - 3, tTop + 14, 6, yBase - tTop - 14), fill: C.bstoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  // String courses.
  for (const yy of [tTop + 40, tTop + 86]) {
    push({ d: `M ${r(tL - 2)} ${r(yy)} L ${r(tR + 2)} ${r(yy)}`, stroke: C.bstoneTrim, strokeWidth: 1.2, roughness: 0.7 });
  }
  // Belfry: a pair of tall louvered lancets high in the tower.
  push({ d: lancet(tCx - 14, tTop + 8, 12, 28), fill: C.recess, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
  push({ d: lancet(tCx + 2, tTop + 8, 12, 28), fill: C.recess, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
  // A tall lancet mid-tower.
  push({ d: lancet(tCx - 7, tTop + 52, 14, 36), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  // Side entrance at the tower base.
  push({ d: lancet(tCx - 11, yBase - 32, 22, 32), fill: C.door, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });

  // --- Tall, slender pyramidal steeple (pale stone), shaded facet + a cross ---
  const stBaseL = tCx - 15;
  const stBaseR = tCx + 15;
  push({ d: `M ${r(stBaseL)} ${r(tTop)} L ${r(tCx)} ${r(steepleApex)} L ${r(stBaseR)} ${r(tTop)} Z`, fill: C.lime, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(steepleApex)} L ${r(stBaseR)} ${r(tTop)} L ${r(tCx)} ${r(tTop)} Z`, fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(steepleApex)} L ${r(tCx)} ${r(tTop)}`, stroke: C.limeDark, strokeWidth: 0.8, roughness: 0.7 });
  // Cross finial.
  push({ d: `M ${r(tCx)} ${r(steepleApex)} L ${r(tCx)} ${r(steepleApex - 12)}`, stroke: C.ink, strokeWidth: 1.6, roughness: 0.7 });
  push({ d: `M ${r(tCx - 3.5)} ${r(steepleApex - 8)} L ${r(tCx + 3.5)} ${r(steepleApex - 8)}`, stroke: C.ink, strokeWidth: 1.6, roughness: 0.7 });
  // Corner pinnacles ringing the steeple base.
  pinnacle(tL + 2, tTop + 3, 26, 7);
  pinnacle(tR - 2, tTop + 3, 26, 7);

  // --- Nave gable front (brownstone wall + steep slate gable roof) ---
  // Steep slate roof behind the gable wall (reads as the roof slope over the nave).
  push({ d: `M ${r(nL - 4)} ${r(naveEave + 6)} L ${r(nCx - 4)} ${r(naveApex - 6)} L ${r(nR + 8)} ${r(naveEave + 6)} Z`, fill: C.slate, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  // Masonry gable wall (pentagon).
  push({
    d: `M ${r(nL)} ${r(yBase)} L ${r(nL)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex)} ` +
      `L ${r(nR)} ${r(naveEave)} L ${r(nR)} ${r(yBase)} Z`,
    fill: C.bstone,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1.1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  // Gable rake coping + apex pinnacle.
  push({ d: `M ${r(nL - 1)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex - 1)} L ${r(nR + 1)} ${r(naveEave)}`, stroke: C.bstoneTrim, strokeWidth: 1.8, roughness: 0.8 });
  pinnacle(nCx, naveApex + 2, 18, 6);
  // A great traceried (rose-topped) pointed window high in the gable.
  push({ d: lancet(nL + 16, naveApex + 18, nR - nL - 32, 70), fill: C.glass, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  for (const mx of [nCx - 14, nCx, nCx + 14]) {
    push({ d: `M ${r(mx)} ${r(naveApex + 40)} L ${r(mx)} ${r(yBase - 44)}`, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7 });
  }
  // Rose/wheel window over the window head.
  push({ d: ellipse(nCx, naveApex + 30, 7, 7), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(nCx - 7)} ${r(naveApex + 30)} L ${r(nCx + 7)} ${r(naveApex + 30)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });
  push({ d: `M ${r(nCx)} ${r(naveApex + 23)} L ${r(nCx)} ${r(naveApex + 37)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });

  // --- Projecting gabled entrance porch with twin pointed doors ---
  const pL = nCx - 24;
  const pR = nCx + 24;
  const pTop = yBase - 48; // porch gable apex zone
  push({ d: `M ${r(pL)} ${r(yBase)} L ${r(pL)} ${r(pTop + 10)} L ${r(nCx)} ${r(pTop)} L ${r(pR)} ${r(pTop + 10)} L ${r(pR)} ${r(yBase)} Z`, fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 1.4, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(pL - 1)} ${r(pTop + 10)} L ${r(nCx)} ${r(pTop - 1)} L ${r(pR + 1)} ${r(pTop + 10)}`, stroke: C.bstoneDark, strokeWidth: 1.6, roughness: 0.8 });
  push({ d: lancet(nCx - 18, pTop + 12, 16, yBase - pTop - 12), fill: C.door, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  push({ d: lancet(nCx + 2, pTop + 12, 16, yBase - pTop - 12), fill: C.door, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });

  // Secondary cross-gable to the far left (hinting the church's double gables).
  push({ d: `M ${r(nL - 4)} ${r(naveEave + 6)} L ${r(nL + 8)} ${r(naveEave - 18)} L ${r(nL + 20)} ${r(naveEave + 6)} Z`, fill: C.slateDark, stroke: C.ink, strokeWidth: 1, roughness: 1, fillStyle: "solid" });

  return { width: W, height: yWater + 6, anchorX: W / 2, anchorY: yWater, scale: 0.3, parts };
}

/**
 * Memorial Presbyterian Church (1881–1883, Pugin & Walter), Seventh Avenue at
 * St. John's Place: a Late Victorian Gothic church of warm Belleville brownstone
 * with a blue-slate roof. Drawn from the avenue: a lower gabled nave on the left
 * with tall stained-glass lancets under an open quatrefoil parapet, and a
 * buttressed corner tower on the right rising through an open twin-arched belfry
 * to a broached octagonal stone spire ringed by four corner pinnacles.
 */
function memorialPresbyterian(): BuildingDrawing {
  const W = 112;
  const parts: BuildingPart[] = [];

  let seed = 640;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 248; // sidewalk
  const yBase = 241;

  // Corner tower (right) + broached spire.
  const tL = 58;
  const tR = 106;
  const tCx = (tL + tR) / 2; // 82
  const tTop = 96; // base of the spire / top of the belfry stage
  const spireApex = 6;

  // Nave (left), lower gabled brownstone front.
  const nL = 0;
  const nR = 58;
  const nCx = (nL + nR) / 2; // 29
  const naveEave = 150; // steep slate roof springs here
  const naveApex = 110;

  const pinnacle = (cx: number, baseY: number, h: number, w: number) => {
    const capH = h * 0.5;
    const shaftTop = baseY - (h - capH);
    push({ d: rect(cx - w / 2, shaftTop, w, h - capH), fill: C.belleville, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
    push({ d: `M ${r(cx - w / 2)} ${r(shaftTop)} L ${r(cx)} ${r(baseY - h)} L ${r(cx + w / 2)} ${r(shaftTop)} Z`, fill: C.bellevilleDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  };

  // Faint horizontal ashlar coursing — reads as cut stone, not brick.
  const ashlar = (x0: number, x1: number, y0: number, y1: number, step = 11) => {
    for (let yy = y0 + step; yy < y1; yy += step) {
      push({ d: `M ${r(x0 + 2)} ${r(yy)} L ${r(x1 - 2)} ${r(yy)}`, stroke: C.bellevilleDark, strokeWidth: 0.45, roughness: 1.2 });
    }
  };

  // Ground shadow first.
  push({ d: ellipse(W / 2, yWater + 2, W * 0.58, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // --- Nave gable front (drawn first; the tower overlaps its right edge) ---
  // Steep slate roof slope behind the gable parapet.
  push({ d: `M ${r(nL - 3)} ${r(naveEave + 4)} L ${r(nCx)} ${r(naveApex - 6)} L ${r(nR + 6)} ${r(naveEave + 4)} Z`, fill: C.slate, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  // Masonry gable wall.
  push({
    d: `M ${r(nL)} ${r(yBase)} L ${r(nL)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex)} ` +
      `L ${r(nR)} ${r(naveEave)} L ${r(nR)} ${r(yBase)} Z`,
    fill: C.belleville,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1.1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  ashlar(nL + 2, nR - 2, naveEave + 8, yBase - 4);
  // Open quatrefoil parapet band along the eaves.
  push({ d: rect(nL, naveEave - 6, nR - nL, 6), fill: C.bellevilleTrim, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  for (const qx of spread(nL + 2, nR - 2, 6, 4)) {
    push({ d: ellipse(qx + 2, naveEave - 3, 1.8, 1.8), fill: C.recess, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }
  // Gable rake coping.
  push({ d: `M ${r(nL - 1)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex - 1)} L ${r(nR + 1)} ${r(naveEave)}`, stroke: C.bellevilleTrim, strokeWidth: 1.6, roughness: 0.8 });
  // Circular (wheel) window in the gable peak.
  push({ d: ellipse(nCx, naveApex + 18, 8, 8), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(nCx - 8)} ${r(naveApex + 18)} L ${r(nCx + 8)} ${r(naveApex + 18)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });
  push({ d: `M ${r(nCx)} ${r(naveApex + 10)} L ${r(nCx)} ${r(naveApex + 26)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });
  // A row of tall stained-glass lancets along the nave.
  for (const wx of spread(nL + 4, nR - 4, 3, 13)) {
    push({ d: lancet(wx, naveEave + 12, 13, 56), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(wx + 6.5)} ${r(naveEave + 24)} L ${r(wx + 6.5)} ${r(yBase - 8)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });
  }
  // Nave buttresses between the windows.
  for (const bx of [nL + 1, nCx - 2, nR - 5]) {
    push({ d: rect(bx, naveEave + 8, 4, yBase - naveEave - 8), fill: C.bellevilleDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.9, fillStyle: "solid" });
  }

  // --- Tower ---
  push({ d: rect(tL, tTop, tR - tL, yBase - tTop), fill: C.belleville, stroke: C.ink, strokeWidth: 1.6, roughness: 1.1, bowing: 0.4, fillStyle: "solid" });
  push({ d: rect(tR - 6, tTop, 6, yBase - tTop), fill: C.bellevilleDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  ashlar(tL + 2, tR - 8, tTop + 12, yBase - 6);
  // Corner buttresses.
  push({ d: rect(tL - 3, tTop + 12, 5, yBase - tTop - 12), fill: C.bellevilleDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(tR - 2, tTop + 12, 5, yBase - tTop - 12), fill: C.bellevilleDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  // String courses.
  for (const yy of [tTop + 44, tTop + 92]) {
    push({ d: `M ${r(tL - 2)} ${r(yy)} L ${r(tR + 2)} ${r(yy)}`, stroke: C.bellevilleTrim, strokeWidth: 1.2, roughness: 0.7 });
  }
  // Open twin-arched belfry near the top.
  push({ d: lancet(tCx - 15, tTop + 8, 13, 30), fill: C.recess, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  push({ d: lancet(tCx + 2, tTop + 8, 13, 30), fill: C.recess, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  // Tall lancet mid-tower.
  push({ d: lancet(tCx - 7, tTop + 52, 14, 32), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  // Entrance porch in the tower base (the church's main entrance).
  push({ d: lancet(tCx - 13, yBase - 40, 26, 40), fill: C.door, stroke: C.ink, strokeWidth: 1.5, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(yBase - 24)} L ${r(tCx)} ${r(yBase)}`, stroke: C.bellevilleTrim, strokeWidth: 0.8, roughness: 0.7 });

  // --- Broached octagonal spire ---
  // Broaches: small triangles at the front corners (square → octagon transition).
  push({ d: `M ${r(tL + 1)} ${r(tTop)} L ${r(tL + 11)} ${r(tTop - 18)} L ${r(tL + 11)} ${r(tTop)} Z`, fill: C.bellevilleDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(tR - 1)} ${r(tTop)} L ${r(tR - 11)} ${r(tTop - 18)} L ${r(tR - 11)} ${r(tTop)} Z`, fill: C.bellevilleDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  // Main spire faces.
  push({ d: `M ${r(tL + 9)} ${r(tTop - 2)} L ${r(tCx)} ${r(spireApex)} L ${r(tR - 9)} ${r(tTop - 2)} Z`, fill: C.belleville, stroke: C.ink, strokeWidth: 1.4, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(spireApex)} L ${r(tR - 9)} ${r(tTop - 2)} L ${r(tCx)} ${r(tTop - 2)} Z`, fill: C.bellevilleDark, stroke: "none", strokeWidth: 0, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(spireApex)} L ${r(tCx)} ${r(tTop - 2)}`, stroke: C.bellevilleDark, strokeWidth: 0.8, roughness: 0.7 });
  // Four corner pinnacles ringing the spire base.
  pinnacle(tL + 2, tTop + 3, 28, 7);
  pinnacle(tR - 2, tTop + 3, 28, 7);
  pinnacle(tCx - 16, tTop + 1, 20, 6);
  pinnacle(tCx + 16, tTop + 1, 20, 6);

  // --- Slender stair turret with a conical cap at the nave/tower corner ---
  const trCx = tL + 4;
  const trW = 11;
  const trSpring = tTop + 48; // cap springs here
  const trApex = tTop + 24;
  push({ d: rect(trCx - trW / 2, trSpring, trW, yBase - trSpring), fill: C.belleville, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  push({ d: rect(trCx + trW / 2 - 3, trSpring, 3, yBase - trSpring), fill: C.bellevilleDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(trCx - trW / 2 - 1)} ${r(trSpring)} L ${r(trCx)} ${r(trApex)} L ${r(trCx + trW / 2 + 1)} ${r(trSpring)} Z`, fill: C.bellevilleDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(trCx)} ${r(trApex)} L ${r(trCx)} ${r(trApex - 5)}`, stroke: C.ink, strokeWidth: 1, roughness: 0.7 }); // finial
  push({ d: ellipse(trCx, trSpring + 20, 3, 3), fill: C.glass, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });

  return { width: W, height: yWater + 6, anchorX: W / 2, anchorY: yWater, scale: 0.25, parts };
}

/**
 * Grace United Methodist Church (1882–1883, Parfitt Brothers), Seventh Avenue at
 * St. John's Place — diagonally across from Memorial Presbyterian. A Victorian
 * Gothic church of sandstone and brownstone with terra-cotta trim and Romanesque
 * / Moorish touches. Its square corner tower was originally crowned by a tall
 * octagonal cone spire; the spire was blown off in the hurricane of September 15,
 * 1944 and never replaced, so the tower is drawn here truncated — capped by a
 * low hipped lid and a battlemented parapet where the steeple once rose. Beside
 * it, the gabled Seventh Avenue front carries the great traceried stained-glass
 * window over a deep pointed entrance.
 */
function graceMethodist(): BuildingDrawing {
  const W = 116;
  const parts: BuildingPart[] = [];

  let seed = 980;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 250; // sidewalk
  const yBase = 243;

  // Square corner tower (right) — truncated where the lost spire used to be.
  const tL = 62;
  const tR = 110;
  const tCx = (tL + tR) / 2; // 86
  const tTop = 70; // top of the masonry shaft / base of the parapet
  const parTop = 58; // top of the battlemented parapet
  const lidApex = 50; // apex of the low hipped cap that now lids the tower

  // Gabled Seventh Avenue front (left), lower than the tower.
  const nL = 0;
  const nR = 62;
  const nCx = (nL + nR) / 2; // 31
  const naveEave = 152; // steep slate roof springs here
  const naveApex = 104;

  const pinnacle = (cx: number, baseY: number, h: number, w: number) => {
    const capH = h * 0.5;
    const shaftTop = baseY - (h - capH);
    push({ d: rect(cx - w / 2, shaftTop, w, h - capH), fill: C.bstone, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
    push({ d: `M ${r(cx - w / 2)} ${r(shaftTop)} L ${r(cx)} ${r(baseY - h)} L ${r(cx + w / 2)} ${r(shaftTop)} Z`, fill: C.bstoneDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  };

  // Ground shadow first.
  push({ d: ellipse(W / 2, yWater + 2, W * 0.58, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // --- Nave gable front (drawn first; the tower overlaps its right edge) ---
  // Steep slate roof slope behind the gable parapet.
  push({ d: `M ${r(nL - 3)} ${r(naveEave + 4)} L ${r(nCx)} ${r(naveApex - 6)} L ${r(nR + 6)} ${r(naveEave + 4)} Z`, fill: C.slate, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  // Masonry gable wall.
  push({
    d: `M ${r(nL)} ${r(yBase)} L ${r(nL)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex)} ` +
      `L ${r(nR)} ${r(naveEave)} L ${r(nR)} ${r(yBase)} Z`,
    fill: C.bstone,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1.1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  // Gable rake coping + apex pinnacle.
  push({ d: `M ${r(nL - 1)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex - 1)} L ${r(nR + 1)} ${r(naveEave)}`, stroke: C.bstoneTrim, strokeWidth: 1.6, roughness: 0.8 });
  pinnacle(nCx, naveApex + 2, 16, 5);
  // A Romanesque corbel arcade band under the eaves (Moorish/Romanesque touch).
  push({ d: rect(nL, naveEave - 7, nR - nL, 4), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  for (const ax of spread(nL + 2, nR - 2, 7, 4)) {
    push({ d: archWindow(ax, naveEave - 6, 4, 4), fill: C.recess, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }
  // The great traceried pointed stained-glass window high in the gable.
  push({ d: lancet(nL + 12, naveApex + 16, nR - nL - 24, 64), fill: C.glass, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  for (const mx of [nCx - 10, nCx, nCx + 10]) {
    push({ d: `M ${r(mx)} ${r(naveApex + 34)} L ${r(mx)} ${r(yBase - 56)}`, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7 });
  }
  // Small rose/wheel window over the window head.
  push({ d: ellipse(nCx, naveApex + 26, 6, 6), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(nCx - 6)} ${r(naveApex + 26)} L ${r(nCx + 6)} ${r(naveApex + 26)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
  push({ d: `M ${r(nCx)} ${r(naveApex + 20)} L ${r(nCx)} ${r(naveApex + 32)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
  // Deep pointed entrance in the gable base.
  push({ d: lancet(nCx - 12, yBase - 44, 24, 44), fill: C.door, stroke: C.ink, strokeWidth: 1.5, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(nCx)} ${r(yBase - 28)} L ${r(nCx)} ${r(yBase)}`, stroke: C.bstoneTrim, strokeWidth: 0.8, roughness: 0.7 });
  // Nave corner buttress on the far left + paired side-aisle lancets.
  push({ d: rect(nL - 3, naveEave + 6, 5, yBase - naveEave - 6), fill: C.bstoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  for (const wx of [nL + 6, nR - 18]) {
    push({ d: lancet(wx, naveEave + 14, 11, 40), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  }

  // --- Tower (square, truncated) ---
  push({ d: rect(tL, tTop, tR - tL, yBase - tTop), fill: C.bstone, stroke: C.ink, strokeWidth: 1.6, roughness: 1.1, bowing: 0.4, fillStyle: "solid" });
  push({ d: rect(tR - 6, tTop, 6, yBase - tTop), fill: C.bstoneDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  // Corner buttresses.
  push({ d: rect(tL - 3, tTop + 12, 5, yBase - tTop - 12), fill: C.bstoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(tR - 2, tTop + 12, 5, yBase - tTop - 12), fill: C.bstoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  // String courses.
  for (const yy of [tTop + 40, tTop + 88]) {
    push({ d: `M ${r(tL - 2)} ${r(yy)} L ${r(tR + 2)} ${r(yy)}`, stroke: C.bstoneTrim, strokeWidth: 1.2, roughness: 0.7 });
  }
  // Belfry: round-arched (Romanesque) paired louvers near the top.
  push({ d: archWindow(tCx - 16, tTop + 10, 13, 28), fill: C.recess, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  push({ d: archWindow(tCx + 3, tTop + 10, 13, 28), fill: C.recess, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  // A round oculus mid-shaft.
  push({ d: ellipse(tCx, tTop + 60, 7, 7), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(tCx - 7)} ${r(tTop + 60)} L ${r(tCx + 7)} ${r(tTop + 60)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
  // Entrance porch in the tower base (the church's main entrance).
  push({ d: lancet(tCx - 13, yBase - 40, 26, 40), fill: C.door, stroke: C.ink, strokeWidth: 1.5, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(yBase - 24)} L ${r(tCx)} ${r(yBase)}`, stroke: C.bstoneTrim, strokeWidth: 0.8, roughness: 0.7 });

  // --- Truncated top where the lost 1944 spire once rose ---
  // Battlemented parapet band.
  push({ d: rect(tL - 2, parTop, tR - tL + 4, tTop - parTop), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
  for (const mx of spread(tL - 1, tR + 1, 4, 8)) {
    push({ d: rect(mx, parTop - 5, 8, 6), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  }
  // Low hipped lid capping the open tower (the post-1944 truncation).
  push({ d: `M ${r(tL + 2)} ${r(parTop)} L ${r(tCx)} ${r(lidApex)} L ${r(tR - 2)} ${r(parTop)} Z`, fill: C.slate, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(lidApex)} L ${r(tR - 2)} ${r(parTop)} L ${r(tCx)} ${r(parTop)} Z`, fill: C.slateDark, stroke: "none", strokeWidth: 0, roughness: 0.9, fillStyle: "solid" });
  // Stub corner pinnacles flanking where the spire stood.
  pinnacle(tL + 2, parTop + 1, 16, 6);
  pinnacle(tR - 2, parTop + 1, 16, 6);

  return { width: W, height: yWater + 6, anchorX: W / 2, anchorY: yWater, scale: 0.25, parts };
}

/**
 * St. Francis Xavier Roman Catholic Church (1900–1904, Thomas Houghton),
 * Sixth Avenue at Carroll Street: an Early English Gothic Revival church in
 * rough-cut granite ashlar trimmed with Indiana limestone. Drawn from Sixth
 * Avenue: a lower gabled nave on the left whose great rose window and pointed
 * entrance face the avenue, and a massive corner tower on the right rising
 * through an open belfry and broached octagonal spire ringed by gargoyles and
 * corner pinnacles.
 */
function stFrancisXavier(): BuildingDrawing {
  const W = 128;
  const parts: BuildingPart[] = [];

  let seed = 1040;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 248; // sidewalk
  const yBase = 241;

  // Corner tower (right) + broached spire.
  const tL = 66;
  const tR = 122;
  const tCx = (tL + tR) / 2; // 94
  const tTop = 88; // base of the spire / top of the belfry stage
  const spireApex = 4;

  // Nave (left), lower gabled granite front.
  const nL = 0;
  const nR = 66;
  const nCx = (nL + nR) / 2; // 33
  const naveEave = 148; // steep slate roof springs here
  const naveApex = 102;

  const pinnacle = (cx: number, baseY: number, h: number, w: number) => {
    const capH = h * 0.5;
    const shaftTop = baseY - (h - capH);
    push({ d: rect(cx - w / 2, shaftTop, w, h - capH), fill: C.granite, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
    push({ d: `M ${r(cx - w / 2)} ${r(shaftTop)} L ${r(cx)} ${r(baseY - h)} L ${r(cx + w / 2)} ${r(shaftTop)} Z`, fill: C.limeDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  };

  // Ground shadow first.
  push({ d: ellipse(W / 2, yWater + 2, W * 0.58, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // --- Nave gable front (drawn first; the tower overlaps its right edge) ---
  // Steep slate roof slope behind the gable parapet.
  push({ d: `M ${r(nL - 3)} ${r(naveEave + 4)} L ${r(nCx)} ${r(naveApex - 6)} L ${r(nR + 6)} ${r(naveEave + 4)} Z`, fill: C.slate, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  // Granite gable wall.
  push({
    d: `M ${r(nL)} ${r(yBase)} L ${r(nL)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex)} ` +
      `L ${r(nR)} ${r(naveEave)} L ${r(nR)} ${r(yBase)} Z`,
    fill: C.granite,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1.1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  // Limestone coping band along the eaves.
  push({ d: rect(nL, naveEave - 5, nR - nL, 5), fill: C.lime, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  // Gable rake coping.
  push({ d: `M ${r(nL - 1)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex - 1)} L ${r(nR + 1)} ${r(naveEave)}`, stroke: C.lime, strokeWidth: 1.6, roughness: 0.8 });
  // The great rose window high in the gable.
  push({ d: ellipse(nCx, naveApex + 22, 14, 14), fill: C.glass, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const x1 = nCx + Math.cos(a) * 14;
    const y1 = naveApex + 22 + Math.sin(a) * 14;
    const x2 = nCx + Math.cos(a + Math.PI / 8) * 7;
    const y2 = naveApex + 22 + Math.sin(a + Math.PI / 8) * 7;
    push({ d: `M ${r(x1)} ${r(y1)} L ${r(x2)} ${r(y2)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });
  }
  push({ d: ellipse(nCx, naveApex + 22, 4, 4), fill: C.glass, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  // Flanking lancets beneath the rose.
  for (const wx of [nL + 8, nR - 20]) {
    push({ d: lancet(wx, naveEave + 10, 12, 52), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(wx + 6)} ${r(naveEave + 22)} L ${r(wx + 6)} ${r(yBase - 10)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });
  }
  // Deep pointed entrance in the gable base.
  push({ d: lancet(nCx - 13, yBase - 42, 26, 42), fill: C.door, stroke: C.ink, strokeWidth: 1.5, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(nCx)} ${r(yBase - 26)} L ${r(nCx)} ${r(yBase)}`, stroke: C.lime, strokeWidth: 0.8, roughness: 0.7 });
  // Nave corner buttress on the far left.
  push({ d: rect(nL - 3, naveEave + 6, 5, yBase - naveEave - 6), fill: C.graniteDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  pinnacle(nL, naveEave + 6, 22, 6);

  // --- Tower ---
  push({ d: rect(tL, tTop, tR - tL, yBase - tTop), fill: C.granite, stroke: C.ink, strokeWidth: 1.6, roughness: 1.1, bowing: 0.4, fillStyle: "solid" });
  push({ d: rect(tR - 7, tTop, 7, yBase - tTop), fill: C.graniteDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  // Corner buttresses.
  push({ d: rect(tL - 3, tTop + 12, 5, yBase - tTop - 12), fill: C.graniteDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(tR - 2, tTop + 12, 5, yBase - tTop - 12), fill: C.graniteDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  // Limestone string courses.
  for (const yy of [tTop + 42, tTop + 88]) {
    push({ d: `M ${r(tL - 2)} ${r(yy)} L ${r(tR + 2)} ${r(yy)}`, stroke: C.lime, strokeWidth: 1.2, roughness: 0.7 });
  }
  // Open twin-arched belfry near the top.
  push({ d: lancet(tCx - 16, tTop + 6, 14, 32), fill: C.recess, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  push({ d: lancet(tCx + 2, tTop + 6, 14, 32), fill: C.recess, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  // Tall lancet mid-tower.
  push({ d: lancet(tCx - 7, tTop + 50, 14, 34), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  // Side entrance at the tower base.
  push({ d: lancet(tCx - 12, yBase - 38, 24, 38), fill: C.door, stroke: C.ink, strokeWidth: 1.5, roughness: 0.8, fillStyle: "solid" });

  // --- Broached octagonal spire (limestone) ---
  push({ d: `M ${r(tL + 1)} ${r(tTop)} L ${r(tL + 12)} ${r(tTop - 20)} L ${r(tL + 12)} ${r(tTop)} Z`, fill: C.limeDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(tR - 1)} ${r(tTop)} L ${r(tR - 12)} ${r(tTop - 20)} L ${r(tR - 12)} ${r(tTop)} Z`, fill: C.limeDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(tL + 10)} ${r(tTop - 2)} L ${r(tCx)} ${r(spireApex)} L ${r(tR - 10)} ${r(tTop - 2)} Z`, fill: C.lime, stroke: C.ink, strokeWidth: 1.4, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(spireApex)} L ${r(tR - 10)} ${r(tTop - 2)} L ${r(tCx)} ${r(tTop - 2)} Z`, fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(spireApex)} L ${r(tCx)} ${r(tTop - 2)}`, stroke: C.limeDark, strokeWidth: 0.8, roughness: 0.7 });
  // Cross finial.
  push({ d: `M ${r(tCx)} ${r(spireApex)} L ${r(tCx)} ${r(spireApex - 10)}`, stroke: C.ink, strokeWidth: 1.5, roughness: 0.7 });
  push({ d: `M ${r(tCx - 3.5)} ${r(spireApex - 6)} L ${r(tCx + 3.5)} ${r(spireApex - 6)}`, stroke: C.ink, strokeWidth: 1.5, roughness: 0.7 });
  // Gargoyles projecting from the spire base (the tower's signature detail).
  for (const gx of [tL + 6, tR - 6]) {
    push({ d: `M ${r(gx)} ${r(tTop + 2)} L ${r(gx + (gx < tCx ? -5 : 5))} ${r(tTop + 10)} L ${r(gx)} ${r(tTop + 8)} Z`, fill: C.graniteDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" });
  }
  // Corner pinnacles ringing the spire base.
  pinnacle(tL + 2, tTop + 2, 26, 7);
  pinnacle(tR - 2, tTop + 2, 26, 7);
  pinnacle(tCx - 18, tTop, 18, 6);
  pinnacle(tCx + 18, tTop, 18, 6);

  return { width: W, height: yWater + 6, anchorX: W / 2, anchorY: yWater, scale: 0.25, parts };
}

/**
 * The Park Slope Branch (originally the Prospect Branch) of the Brooklyn Public
 * Library (1906, Raymond F. Almirall), 431 Sixth Avenue at 9th Street — one of
 * the earliest of Brooklyn's Carnegie libraries. Drawn from its Sixth Avenue
 * front: a long, low, two-story red-brick Classical Revival block with limestone
 * trim, a continuous stone parapet, and three tall double-height windows on each
 * side (each capped by a limestone keystone carved with a torch, "the light of
 * learning"). At its center a projecting portico — paired non-fluted Doric
 * columns carrying a triglyph entablature, a low pediment, and the engraved
 * "BROOKLYN PUBLIC LIBRARY" band — shelters a recessed entrance reached by a
 * short flight of steps up from the raised limestone basement.
 */
function parkSlopeLibrary(): BuildingDrawing {
  const W = 176;
  const parts: BuildingPart[] = [];

  let seed = 720;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 152; // sidewalk
  const yBasement = 120; // top of the raised limestone basement
  const yParTop = 30; // top of the long stone parapet
  const yCorBot = 42; // bottom of cornice; brick wall begins
  const L = 6;
  const R = 170;
  const DX = 12; // shaded right return for mass

  // Projecting central portico.
  const pcL = 60;
  const pcR = 116;
  const pcCx = (pcL + pcR) / 2; // 88
  const yPedApex = 0;
  const yPedBase = 16; // pediment base / portico cornice top
  const yPCorBot = 22;
  const yFriezeBot = 38;
  const yArchBot = 41;
  const yStyl = 122; // top of the stylobate / steps

  // A tall double-height window with a limestone surround and a torch keystone.
  const tallWin = (x: number, y: number, w: number, h: number) => {
    push({ d: rect(x - 3, y - 3, w + 6, h + 6), fill: C.stone, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
    push({ d: rect(x, y, w, h), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.7, fillStyle: "solid" });
    push({ d: `M ${r(x + w / 2)} ${r(y)} L ${r(x + w / 2)} ${r(y + h)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.5 });
    for (const t of [0.3, 0.58, 0.82]) {
      push({ d: `M ${r(x)} ${r(y + h * t)} L ${r(x + w)} ${r(y + h * t)}`, stroke: C.ink, strokeWidth: 0.5, roughness: 0.5 });
    }
    // Torch keystone over the window head.
    const kx = x + w / 2;
    push({ d: `M ${r(kx - 3)} ${r(y - 3)} L ${r(kx + 3)} ${r(y - 3)} L ${r(kx + 2.2)} ${r(y - 10)} L ${r(kx - 2.2)} ${r(y - 10)} Z`, fill: C.stoneDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.6, fillStyle: "solid" });
    const ft = y - 10;
    push({ d: `M ${r(kx)} ${r(ft)} C ${r(kx + 3)} ${r(ft - 2)} ${r(kx + 1.5)} ${r(ft - 7)} ${r(kx)} ${r(ft - 9)} C ${r(kx - 1.5)} ${r(ft - 7)} ${r(kx - 3)} ${r(ft - 2)} ${r(kx)} ${r(ft)} Z`, fill: C.gold, stroke: C.goldDark, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
  };

  // A non-fluted Doric column with a simple capital + base and a shaded right side.
  const column = (cx: number) => {
    const w = 6;
    push({ d: rect(cx - w / 2, yArchBot + 3, w, yStyl - yArchBot - 8), fill: C.stone, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    push({ d: rect(cx + w / 2 - 1.8, yArchBot + 3, 1.8, yStyl - yArchBot - 8), fill: C.stoneDark, stroke: "none", strokeWidth: 0, roughness: 0.8, fillStyle: "solid" });
    push({ d: rect(cx - w / 2 - 1.5, yArchBot, w + 3, 4), fill: C.stone, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" }); // capital
    push({ d: rect(cx - w / 2 - 1.5, yStyl - 5, w + 3, 5), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" }); // base
  };

  // Ground shadow first.
  push({
    d: ellipse(W / 2 + 4, yWater + 2, W * 0.56, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Shaded right return (the 9th Street side), for mass.
  push({
    d: `M ${r(R)} ${r(yParTop)} L ${r(R + DX)} ${r(yParTop + 7)} ` +
      `L ${r(R + DX)} ${r(yWater - 3)} L ${r(R)} ${r(yWater)} Z`,
    fill: C.brickDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });

  // Main red-brick wall.
  push({
    d: rect(L, yCorBot, R - L, yWater - yCorBot),
    fill: C.brick,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  // A few faint brick coursing lines.
  for (const yy of [yCorBot + 26, yCorBot + 54]) {
    push({ d: `M ${r(L + 3)} ${r(yy)} L ${r(R - 3)} ${r(yy)}`, stroke: C.brickDark, strokeWidth: 0.5, roughness: 1.1 });
  }

  // Raised limestone basement course across the foot.
  push({
    d: rect(L - 2, yBasement, (R - L) + 4 + DX, yWater - yBasement),
    fill: C.stoneDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  push({ d: `M ${r(L - 1)} ${r(yBasement + 6)} L ${r(R + DX - 1)} ${r(yBasement + 6)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7 });

  // Continuous stone parapet + cornice along the whole front (drawn over the
  // brick wall top; the portico will rise above it at the center).
  push({
    d: rect(L - 3, yParTop, (R - L) + 6 + DX, yCorBot - yParTop),
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 0.9,
    fillStyle: "solid",
  });
  push({ d: `M ${r(L - 4)} ${r(yParTop + 3)} L ${r(R + DX + 1)} ${r(yParTop + 3)}`, stroke: C.stoneDark, strokeWidth: 0.8, roughness: 0.7 });

  // Three tall double-height windows on each side of the portico.
  const winY = 56;
  const winH = 58;
  for (const x of spread(10, pcL - 4, 3, 11)) tallWin(x, winY, 11, winH);
  for (const x of spread(pcR + 4, R - 6, 3, 11)) tallWin(x, winY, 11, winH);

  // --- Projecting central portico ---
  // Limestone back wall behind the columns.
  push({
    d: rect(pcL, yArchBot - 1, pcR - pcL, yStyl - yArchBot + 1),
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 0.9,
    fillStyle: "solid",
  });

  // Recessed entrance with a transom + torch keystone.
  const dL = 78;
  const dR = 98;
  const dTop = 72;
  push({ d: rect(dL, dTop, dR - dL, yStyl - dTop), fill: C.door, stroke: C.ink, strokeWidth: 1.4, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(dL, dTop, dR - dL, 6), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" }); // transom
  push({ d: `M ${r(pcCx)} ${r(dTop + 6)} L ${r(pcCx)} ${r(yStyl)}`, stroke: C.stone, strokeWidth: 0.8, roughness: 0.7 }); // door split
  // Torch keystone over the entrance.
  push({ d: `M ${r(pcCx - 3.5)} ${r(dTop - 2)} L ${r(pcCx + 3.5)} ${r(dTop - 2)} L ${r(pcCx + 2.4)} ${r(dTop - 11)} L ${r(pcCx - 2.4)} ${r(dTop - 11)} Z`, fill: C.stoneDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.6, fillStyle: "solid" });
  push({ d: `M ${r(pcCx)} ${r(dTop - 11)} C ${r(pcCx + 3.5)} ${r(dTop - 13)} ${r(pcCx + 1.8)} ${r(dTop - 19)} ${r(pcCx)} ${r(dTop - 21)} C ${r(pcCx - 1.8)} ${r(dTop - 19)} ${r(pcCx - 3.5)} ${r(dTop - 13)} ${r(pcCx)} ${r(dTop - 11)} Z`, fill: C.gold, stroke: C.goldDark, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });

  // Two pairs of Doric columns flanking the entrance.
  for (const cx of [67, 75, 101, 109]) column(cx);

  // Stylobate the columns stand on.
  push({ d: rect(pcL - 2, yStyl, pcR - pcL + 4, 5), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });

  // Entablature: architrave + frieze with triglyphs + an inscription band.
  push({ d: rect(pcL - 3, yFriezeBot, (pcR + 3) - (pcL - 3), yArchBot - yFriezeBot), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" }); // architrave
  push({ d: rect(pcL - 3, yPCorBot, (pcR + 3) - (pcL - 3), yFriezeBot - yPCorBot), fill: C.stone, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" }); // frieze
  // Engraved "BROOKLYN PUBLIC LIBRARY" band (suggested with tick lettering).
  push({ d: rect(pcL + 2, yPCorBot + 2, (pcR - 2) - (pcL + 2), 5), fill: C.stoneDark, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  for (const x of spread(pcL + 4, pcR - 4, 16, 1.4)) {
    push({ d: `M ${r(x)} ${r(yPCorBot + 3)} L ${r(x)} ${r(yPCorBot + 6)}`, stroke: C.stone, strokeWidth: 0.6, roughness: 0.5 });
  }
  // Triglyphs over the column axes.
  for (const tx of [67, 75, 101, 109]) {
    push({ d: rect(tx - 1.5, yFriezeBot - 6, 3, 6), fill: C.stoneDark, stroke: C.ink, strokeWidth: 0.5, roughness: 0.6, fillStyle: "solid" });
  }

  // Portico cornice (overhangs) + low pediment.
  push({ d: rect(pcL - 6, yPedBase, (pcR + 6) - (pcL - 6), yPCorBot - yPedBase), fill: C.stone, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  push({
    d: `M ${r(pcL - 6)} ${r(yPedBase)} L ${r(pcCx)} ${r(yPedApex)} L ${r(pcR + 6)} ${r(yPedBase)} Z`,
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 0.8,
    fillStyle: "solid",
  });
  push({ d: `M ${r(pcCx)} ${r(yPedApex)} L ${r(pcR + 6)} ${r(yPedBase)} L ${r(pcCx)} ${r(yPedBase)} Z`, fill: C.stoneDark, stroke: "none", strokeWidth: 0, roughness: 0.8, fillStyle: "solid" }); // shaded right face of tympanum

  // --- Entrance steps from the raised basement down to the sidewalk ---
  push({
    d: `M ${r(pcL - 4)} ${r(yWater)} L ${r(pcL + 4)} ${r(yStyl + 5)} ` +
      `L ${r(pcR - 4)} ${r(yStyl + 5)} L ${r(pcR + 4)} ${r(yWater)} Z`,
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 0.9,
    fillStyle: "solid",
  });
  const steps = 4;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const y = yStyl + 5 + (yWater - (yStyl + 5)) * t;
    const dx = (pcR - pcL) / 2 + 8 * t;
    push({ d: `M ${r(pcCx - dx)} ${r(y)} L ${r(pcCx + dx)} ${r(y)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
  }

  return {
    width: R + DX + 4,
    height: yWater + 6,
    anchorX: W / 2,
    anchorY: yWater,
    scale: 0.3,
    parts,
  };
}

/**
 * The Sanders Theatre (1928), 188 Prospect Park West at 14th Street — the brick
 * movie palace that later became the Pavilion and, since 2018, Nitehawk Prospect
 * Park. Drawn from its facades old and new, capturing the building's three
 * signature notes: a stepped brick parapet rising to a curved central crown; a
 * projecting iron balcony carried on brackets; and, below darker brick, a band
 * of tall slender round-arched windows set in pale limestone — all over a big
 * projecting theater marquee with a lit, lettered fascia.
 */
function sandersTheatre(): BuildingDrawing {
  const FW = 120; // front (Prospect Park West) face width
  const DX = 14; // shaded right-return depth (the 14th Street flank)
  const parts: BuildingPart[] = [];

  let seed = 800;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical bands (top-down). The stepped parapet occupies the zone above the
  // cornice line (yWallTop), so the brick facade is pushed down to leave room.
  const yWallTop = 30; // cornice line; brick wall begins (parapet rises above)
  const yBalcTop = 44; // top rail of the projecting balcony
  const yBalcBot = 54; // balcony floor / top of the limestone window band
  const yWinTop = 62; // tops of the tall arched windows
  const yWinBot = 126;
  const yStoneBot = 134; // bottom of the limestone window band
  const yMarqTop = 146; // projecting marquee fascia
  const yMarqBot = 172;
  const yShop = 176; // storefront / entrance zone under the marquee
  const yBase = 206; // base course
  const yWater = 212; // sidewalk

  const cx = FW / 2; // 60

  // Ground shadow first, so the building sits on top of it.
  push({ d: ellipse(cx + 4, yWater + 2, FW * 0.6, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // Shaded right return (the 14th Street flank), for mass.
  push({
    d: `M ${r(FW)} ${r(yWallTop)} L ${r(FW + DX)} ${r(yWallTop + 8)} ` +
      `L ${r(FW + DX)} ${r(yWater - 3)} L ${r(FW)} ${r(yWater)} Z`,
    fill: C.brickDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1.1, fillStyle: "solid",
  });

  // Main red-brick wall.
  push({
    d: rect(0, yWallTop, FW, yWater - yWallTop),
    fill: C.brick, stroke: C.ink, strokeWidth: 1.6, roughness: 1, bowing: 0.5, fillStyle: "solid",
  });
  // Brick corner piers framing the facade.
  for (const px of [0, FW - 6]) {
    push({ d: rect(px, yWallTop, 6, yWater - yWallTop), fill: C.brickDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  }

  // --- Stepped brick parapet rising to a curved central crown ---
  push({
    d:
      `M 0 ${r(yWallTop)} L 0 22 L 20 22 L 20 16 L 40 16 L 40 8 ` +
      `L 46 8 Q ${r(cx)} 1 74 8 L 80 8 L 80 16 L 100 16 L 100 22 ` +
      `L ${r(FW)} 22 L ${r(FW)} ${r(yWallTop)} Z`,
    fill: C.brick, stroke: C.ink, strokeWidth: 1.5, roughness: 1, fillStyle: "solid",
  });
  // Pale stone coping running along the stepped silhouette.
  push({
    d:
      `M 0 22 L 20 22 L 20 16 L 40 16 L 40 8 L 46 8 ` +
      `Q ${r(cx)} 1 74 8 L 80 8 L 80 16 L 100 16 L 100 22 L ${r(FW)} 22`,
    stroke: C.stone, strokeWidth: 2.4, roughness: 0.8,
  });
  // A small stone medallion in the crown.
  push({ d: ellipse(cx, 12, 3, 3), fill: C.stone, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  // Stone cornice ledge across the whole front, at the parapet's base.
  push({ d: rect(-3, yWallTop - 4, FW + 6 + DX, 5), fill: C.stone, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });

  // Recessed darker brick band behind the balcony.
  push({ d: rect(6, yWallTop + 2, FW - 12, yBalcBot - yWallTop - 2), fill: C.brickDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });

  // --- Pale limestone window band (lighter than the brick above and below) ---
  push({ d: rect(4, yBalcBot, FW - 8, yStoneBot - yBalcBot), fill: C.lime, stroke: C.ink, strokeWidth: 1.4, roughness: 0.9, fillStyle: "solid" });
  // Sill course at the foot of the band.
  push({ d: rect(4, yStoneBot - 4, FW - 8, 4), fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });

  // Five tall, slender round-arched windows in the limestone band.
  const winH = yWinBot - yWinTop;
  for (const x of spread(12, FW - 12, 5, 11)) {
    push({ d: archWindow(x, yWinTop, 11, winH), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
    const wcx = x + 5.5;
    push({ d: `M ${r(wcx)} ${r(yWinTop + 6)} L ${r(wcx)} ${r(yWinBot)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 }); // mullion
    push({ d: `M ${r(x + 1)} ${r(yWinTop + winH * 0.55)} L ${r(x + 10)} ${r(yWinTop + winH * 0.55)}`, stroke: C.ink, strokeWidth: 0.5, roughness: 0.6 }); // transom
  }

  // --- Projecting iron balcony on brackets ---
  // Support brackets first, so the floor ledge draws over their tops.
  for (const bx of spread(8, FW - 8, 7, 2)) {
    push({ d: `M ${r(bx)} ${r(yBalcBot + 6)} L ${r(bx + 4)} ${r(yBalcBot - 1)} L ${r(bx + 4)} ${r(yBalcBot + 6)} Z`, fill: C.rail, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  }
  // Projecting floor ledge.
  push({ d: rect(0, yBalcBot - 3, FW, 4), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  // Iron railing: top rail + vertical balusters.
  push({ d: rect(0, yBalcTop, FW, 2), fill: C.rail, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  for (const x of spread(3, FW - 3, 34, 0.9)) {
    push({ d: `M ${r(x)} ${r(yBalcTop + 2)} L ${r(x)} ${r(yBalcBot - 3)}`, stroke: C.rail, strokeWidth: 0.8, roughness: 0.6 });
  }

  // --- Projecting marquee across the front ---
  const mL = -6;
  const mR = FW + 6;
  // Tie rods up to the facade.
  for (const sx of [cx - 40, cx - 14, cx + 14, cx + 40]) {
    push({ d: `M ${r(sx)} ${r(yMarqTop)} L ${r(sx + 3)} ${r(yMarqTop - 8)}`, stroke: C.ink, strokeWidth: 1, roughness: 0.7 });
  }
  // Red name band along the top of the marquee.
  push({ d: rect(mL, yMarqTop, mR - mL, 8), fill: C.frieze, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  for (const x of spread(mL + 22, mR - 22, 8, 3)) {
    push({ d: rect(x, yMarqTop + 2, 3, 4), fill: C.stone, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }
  // Cream letter board below the name band.
  push({ d: rect(mL, yMarqTop + 8, mR - mL, yMarqBot - yMarqTop - 8), fill: C.stone, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  // Two rows of title lettering (tick marks).
  for (const [ly, n] of [[yMarqTop + 12, 18], [yMarqTop + 19, 16]] as const) {
    for (const x of spread(mL + 8, mR - 8, n, 2)) {
      push({ d: rect(x, ly, 2, 4), fill: C.ink, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
    }
  }
  // Lit-bulb edge along the bottom of the marquee.
  for (const x of spread(mL + 2, mR - 2, 22, 1.6)) {
    push({ d: ellipse(x + 0.8, yMarqBot - 2, 1.2, 1.2), fill: C.gold, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }
  // Marquee soffit (shaded underside).
  push({ d: rect(mL + 2, yMarqBot, mR - mL - 4, 3), fill: C.recess, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });

  // --- Ground floor: entrance doors flanked by poster cases ---
  push({ d: rect(-2, yBase, FW + 4 + DX, yWater - yBase + 2), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" }); // base band
  push({ d: rect(2, yShop, FW - 4, yBase - yShop), fill: C.door, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" }); // dim lobby front
  // Central bank of entrance doors with a transom band.
  const dL = cx - 22;
  const dR = cx + 22;
  push({ d: rect(dL, yShop + 2, dR - dL, 6), fill: C.glass, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
  for (const x of spread(dL, dR, 4, 9)) {
    push({ d: rect(x, yShop + 10, 9, yBase - yShop - 12), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" });
    push({ d: `M ${r(x + 4.5)} ${r(yShop + 12)} L ${r(x + 4.5)} ${r(yBase - 3)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
  }
  // Illuminated poster cases flanking the doors.
  for (const x of [10, FW - 24]) {
    push({ d: rect(x, yShop + 8, 14, yBase - yShop - 12), fill: C.recess, stroke: C.stone, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  }

  return { width: FW + DX, height: yWater + 6, anchorX: cx, anchorY: yWater, scale: 0.34, parts };
}

/**
 * A little golden meadow wildflower, used to mark the Long Meadow in Prospect
 * Park rather than a building: a single bloom of petals around a brown seed
 * disc, on a gently curved green stem with two leaves. Authored top-down with a
 * bottom-center ground anchor like the other markers.
 */
function longMeadowFlower(): BuildingDrawing {
  const W = 64;
  const H = 96;
  const parts: BuildingPart[] = [];

  let seed = 880;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const cx = W / 2; // 32
  const groundY = H - 2; // sidewalk / ground line
  const bloomCy = 30; // center of the bloom
  const rCenter = 8.5;

  // Ground shadow first, so the flower sits on top of it.
  push({
    d: ellipse(cx, groundY + 1, 15, 4),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Stem (a gentle S-curve up to the bloom).
  push({
    d: `M ${r(cx)} ${r(groundY)} Q ${r(cx - 7)} ${r(groundY - 28)} ${r(cx)} ${r(bloomCy + rCenter)}`,
    stroke: C.stem,
    strokeWidth: 3,
    roughness: 1,
    bowing: 1.4,
  });

  // Two leaves along the stem.
  const leaf = (baseY: number, dir: 1 | -1) => {
    const tipX = cx + dir * 17;
    const tipY = baseY - 9;
    const cX = cx + dir * 9;
    const cY = baseY - 17;
    push({
      d:
        `M ${r(cx)} ${r(baseY)} Q ${r(cX)} ${r(cY)} ${r(tipX)} ${r(tipY)} ` +
        `Q ${r(cx + dir * 10)} ${r(baseY + 1)} ${r(cx)} ${r(baseY)} Z`,
      fill: C.leaf,
      stroke: C.stem,
      strokeWidth: 1,
      roughness: 1,
      bowing: 1,
      fillStyle: "solid",
    });
  };
  leaf(groundY - 20, -1);
  leaf(groundY - 38, 1);

  // Petals radiating from the bloom center (drawn before the disc so the disc
  // caps their bases).
  const petal = (angle: number) => {
    const ri = rCenter - 1;
    const ro = rCenter + 16;
    const halfW = 6;
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const px = -sa; // perpendicular direction
    const py = ca;
    const baseX = cx + ri * ca;
    const baseY = bloomCy + ri * sa;
    const tipX = cx + ro * ca;
    const tipY = bloomCy + ro * sa;
    const midR = (ri + ro) / 2;
    const mX = cx + midR * ca;
    const mY = bloomCy + midR * sa;
    push({
      d:
        `M ${r(baseX)} ${r(baseY)} ` +
        `Q ${r(mX + halfW * px)} ${r(mY + halfW * py)} ${r(tipX)} ${r(tipY)} ` +
        `Q ${r(mX - halfW * px)} ${r(mY - halfW * py)} ${r(baseX)} ${r(baseY)} Z`,
      fill: C.petal,
      stroke: C.petalDark,
      strokeWidth: 1,
      roughness: 1.1,
      bowing: 1.2,
      fillStyle: "solid",
    });
  };
  const N = 9;
  for (let i = 0; i < N; i++) petal((i / N) * Math.PI * 2 - Math.PI / 2);

  // Brown seed disc.
  push({
    d: ellipse(cx, bloomCy, rCenter, rCenter),
    fill: C.bloomCenter,
    stroke: C.bloomCenterDark,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  // A few seed stipples on the disc.
  for (const [dx, dy] of [[-3, -2], [2, -3], [3, 2], [-2, 3], [0, 0]] as const) {
    push({
      d: ellipse(cx + dx, bloomCy + dy, 1, 1),
      fill: C.bloomCenterDark,
      stroke: "none",
      strokeWidth: 0,
      roughness: 0.7,
      fillStyle: "solid",
    });
  }

  return { width: W, height: H, anchorX: cx, anchorY: groundY, scale: 0.5, parts };
}

/**
 * Prospect Park Dog Beach — a happy golden retriever sitting on the sandy
 * shore, facing the viewer: round head, floppy ears, closed smile-eyes, tongue
 * out, and a tennis ball at its paws. Front-facing and blobby so it stays
 * friendly at map scale (no stick legs or profile snout).
 */
function dogBeach(): BuildingDrawing {
  const W = 76;
  const H = 96;
  const parts: BuildingPart[] = [];

  let seed = 900;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const cx = W / 2; // 38
  const groundY = H - 2;
  const yWater = 68;

  // Ground shadow first.
  push({
    d: ellipse(cx, groundY + 1, 30, 5),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Water band.
  push({
    d: rect(0, yWater, W, groundY - yWater + 2),
    fill: "rgba(159,183,172,0.82)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.2,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(4)} ${r(yWater + 4)} Q ${r(cx)} ${r(yWater + 5)} ${r(W - 4)} ${r(yWater + 4)}`,
    stroke: C.waterDark,
    strokeWidth: 0.7,
    roughness: 1.2,
    bowing: 1.1,
  });

  // Sandy shore.
  push({
    d: `M 2 ${groundY} C 14 ${yWater + 5} 30 ${yWater + 3} ${cx} ${yWater + 5} C 46 ${yWater + 3} 62 ${yWater + 5} 74 ${groundY} Z`,
    fill: C.sand,
    stroke: C.sandDark,
    strokeWidth: 1,
    roughness: 1.2,
    bowing: 1,
    fillStyle: "solid",
  });

  const yBody = 58;
  const yHead = 36;

  // Tail wagging behind the body (drawn first).
  push({
    d: `M ${r(cx + 16)} ${r(yBody + 2)} Q ${r(cx + 28)} ${r(yBody - 14)} ${r(cx + 22)} ${r(yBody - 22)}`,
    stroke: C.dogFur,
    strokeWidth: 5,
    roughness: 0.9,
    bowing: 1.5,
  });

  // Sitting body — one round blob, wider at the base.
  push({
    d: ellipse(cx, yBody, 20, 17),
    fill: C.dogFur,
    stroke: C.dogFurDark,
    strokeWidth: 1.1,
    roughness: 0.9,
    fillStyle: "solid",
  });
  // Lighter chest patch.
  push({
    d: ellipse(cx, yBody + 4, 12, 10),
    fill: C.dogChest,
    stroke: "none",
    strokeWidth: 0,
    roughness: 0.85,
    fillStyle: "solid",
  });

  // Floppy ears (behind the head).
  push({
    d: ellipse(cx - 14, yHead + 2, 6, 11),
    fill: C.dogFurDark,
    stroke: C.dogFurDark,
    strokeWidth: 0.8,
    roughness: 0.85,
    fillStyle: "solid",
  });
  push({
    d: ellipse(cx + 14, yHead + 2, 6, 11),
    fill: C.dogFurDark,
    stroke: C.dogFurDark,
    strokeWidth: 0.8,
    roughness: 0.85,
    fillStyle: "solid",
  });

  // Round head.
  push({
    d: ellipse(cx, yHead, 15, 14),
    fill: C.dogFur,
    stroke: C.dogFurDark,
    strokeWidth: 1.1,
    roughness: 0.9,
    fillStyle: "solid",
  });

  // Front paws — two soft bumps (no stick legs).
  push({
    d: ellipse(cx - 10, yBody + 14, 7, 5),
    fill: C.dogFur,
    stroke: C.dogFurDark,
    strokeWidth: 0.9,
    roughness: 0.85,
    fillStyle: "solid",
  });
  push({
    d: ellipse(cx + 10, yBody + 14, 7, 5),
    fill: C.dogFur,
    stroke: C.dogFurDark,
    strokeWidth: 0.9,
    roughness: 0.85,
    fillStyle: "solid",
  });

  // Happy closed eyes (gentle upward arcs — no creepy dot stare).
  push({
    d: `M ${r(cx - 9)} ${r(yHead - 1)} Q ${r(cx - 6)} ${r(yHead - 4)} ${r(cx - 3)} ${r(yHead - 1)}`,
    stroke: C.dogNose,
    strokeWidth: 1.3,
    roughness: 0.7,
    bowing: 1,
  });
  push({
    d: `M ${r(cx + 3)} ${r(yHead - 1)} Q ${r(cx + 6)} ${r(yHead - 4)} ${r(cx + 9)} ${r(yHead - 1)}`,
    stroke: C.dogNose,
    strokeWidth: 1.3,
    roughness: 0.7,
    bowing: 1,
  });

  // Nose and little smile.
  push({
    d: ellipse(cx, yHead + 3, 3.5, 2.8),
    fill: C.dogNose,
    stroke: "none",
    strokeWidth: 0,
    roughness: 0.7,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(cx - 4)} ${r(yHead + 6)} Q ${r(cx)} ${r(yHead + 9)} ${r(cx + 4)} ${r(yHead + 6)}`,
    stroke: C.dogNose,
    strokeWidth: 0.9,
    roughness: 0.7,
    bowing: 1.1,
  });

  // Tongue hanging out — the classic happy-dog tell.
  push({
    d: ellipse(cx, yHead + 11, 4, 5),
    fill: C.dogTongue,
    stroke: C.dogNose,
    strokeWidth: 0.7,
    roughness: 0.8,
    fillStyle: "solid",
  });

  // Tennis ball at its feet.
  const bx = cx + 22;
  const by = yBody + 16;
  push({
    d: ellipse(bx, by, 7, 7),
    fill: C.ball,
    stroke: C.dogFurDark,
    strokeWidth: 0.8,
    roughness: 0.85,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(bx - 5)} ${r(by)} Q ${r(bx)} ${r(by - 6)} ${r(bx + 5)} ${r(by)}`,
    stroke: C.ballSeam,
    strokeWidth: 1,
    roughness: 0.8,
    bowing: 1,
  });

  return { width: W, height: H, anchorX: cx, anchorY: groundY, scale: 0.52, parts };
}

/**
 * The Prospect Park Boathouse (1905, Helmle & Huberty), a white glazed
 * terra-cotta Beaux-Arts pavilion on the Lullwater, modeled on Sansovino's
 * Library of St Mark in Venice. Drawn frontally as its signature: a grand
 * ground-floor arcade of tall round arches with keystones, a rich entablature
 * (frieze with roundels over a bracketed, modillioned cornice), and a
 * balustraded roof parapet — all standing at the water's edge with a faint
 * reflection rippling below.
 */
function boathouse(): BuildingDrawing {
  const W = 150;
  const parts: BuildingPart[] = [];

  let seed = 940;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const L = 6;
  const R = W - 6; // 144
  const L2 = 18; // set-back upper story
  const R2 = W - 18; // 132

  // Vertical bands (top-down): a low-roofed upper window story over a grand
  // ground arcade, separated by a terrace balustrade.
  const yRoofTop = 2; // thin roof rail across the upper block
  const yRoofBot = 5;
  const yUpCorTop = 5; // upper-story cornice
  const yUpCorBot = 11;
  const yUpWinTop = 16; // rectangular upper-story windows
  const yUpWinBot = 30;
  const yBalTop = 30; // terrace balustrade (in front of the upper story base)
  const yBalBot = 40;
  const yArcCorTop = 40; // arcade entablature + cornice
  const yArcCorBot = 48;
  const yArchTop = 54; // crown of the arcade arches
  const yTerrace = 126; // terrace floor / springing of the arcade
  const yTerBot = 134; // base course at the water
  const yWater = 146; // waterline
  const H = 154;

  const archXs = spread(8, W - 8, 5, 18);
  const aw = 18;

  // Faint reflection of the arcade in the Lullwater (drawn first, behind water).
  for (const x of archXs) {
    push({ d: rect(x, yWater + 1, aw, 9), fill: C.bhouseDark, stroke: "none", strokeWidth: 0, roughness: 1.4, fillStyle: "solid" });
  }
  // Water band over the reflection (semi-transparent so the reflection shows).
  push({ d: rect(-4, yWater, W + 8, H - yWater + 2), fill: "rgba(159,183,172,0.78)", stroke: "none", strokeWidth: 0, roughness: 1.4, fillStyle: "solid" });
  for (const yy of [yWater + 4, yWater + 8]) {
    push({ d: `M ${r(2)} ${r(yy)} L ${r(W - 2)} ${r(yy)}`, stroke: C.waterDark, strokeWidth: 0.8, roughness: 1.6, bowing: 1.2 });
  }

  // Terrace / stylobate the arcade stands on.
  push({ d: rect(L - 3, yTerrace, R - L + 6, yTerBot - yTerrace + 4), fill: C.bhouseDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });

  // --- Ground arcade ---
  // Facade wall (the arcade is carved out of it as recessed arches).
  push({ d: rect(L, yArcCorBot, R - L, yTerrace - yArcCorBot + 2), fill: C.bhouse, stroke: C.ink, strokeWidth: 1.6, roughness: 1, bowing: 0.4, fillStyle: "solid" });
  const archH = yTerrace - yArchTop;
  for (const x of archXs) {
    push({ d: archWindow(x, yArchTop, aw, archH), fill: C.recess, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
    const kx = x + aw / 2;
    push({ d: `M ${r(kx - 3)} ${r(yArchTop - 2)} L ${r(kx + 3)} ${r(yArchTop - 2)} L ${r(kx + 2.2)} ${r(yArchTop + 8)} L ${r(kx - 2.2)} ${r(yArchTop + 8)} Z`, fill: C.bhouseTrim, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" }); // keystone
    push({ d: rect(x + 2, yTerrace - 14, aw - 4, 12), fill: C.water, stroke: "none", strokeWidth: 0, roughness: 0.8, fillStyle: "solid" }); // water glint
  }
  // Roundels in the spandrels between the arches.
  for (let i = 0; i < archXs.length - 1; i++) {
    const px = (archXs[i] + aw + archXs[i + 1]) / 2;
    push({ d: ellipse(px, yArchTop + 2, 3, 3), fill: C.bhouseDark, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  }
  // Arcade entablature + modillioned cornice (overhangs both ends).
  push({ d: rect(L - 5, yArcCorTop, R - L + 10, yArcCorBot - yArcCorTop), fill: C.bhouse, stroke: C.ink, strokeWidth: 1.5, roughness: 0.8, fillStyle: "solid" });
  for (const x of spread(L, R, 18, 3)) {
    push({ d: rect(x, yArcCorBot - 1, 3, 4), fill: C.bhouseDark, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }

  // --- Upper window story (set back, behind the terrace balustrade) ---
  push({ d: rect(L2, yUpCorBot, R2 - L2, yBalBot - yUpCorBot + 2), fill: C.bhouse, stroke: C.ink, strokeWidth: 1.4, roughness: 0.9, fillStyle: "solid" });
  const upXs = spread(L2 + 3, R2 - 3, 7, 11);
  for (const x of upXs) {
    push({ d: rect(x - 1, yUpWinTop - 2, 13, yUpWinBot - yUpWinTop + 4), fill: C.bhouseTrim, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" }); // surround
    push({ d: rect(x, yUpWinTop, 11, yUpWinBot - yUpWinTop), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" });
    push({ d: `M ${r(x + 5.5)} ${r(yUpWinTop)} L ${r(x + 5.5)} ${r(yUpWinBot)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
  }
  // Upper cornice + thin roof rail.
  push({ d: rect(L2 - 4, yUpCorTop, R2 - L2 + 8, yUpCorBot - yUpCorTop), fill: C.bhouse, stroke: C.ink, strokeWidth: 1.3, roughness: 0.8, fillStyle: "solid" });
  for (const x of spread(L2, R2, 12, 3)) {
    push({ d: rect(x, yUpCorBot - 1, 3, 3), fill: C.bhouseDark, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }
  push({ d: rect(L2 - 2, yRoofTop, R2 - L2 + 4, yRoofBot - yRoofTop), fill: C.bhouseTrim, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" });

  // --- Terrace balustrade across the front (over the arcade cornice) ---
  push({ d: rect(L - 4, yBalBot - 3, R - L + 8, 3), fill: C.bhouseTrim, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" }); // bottom rail
  push({ d: rect(L - 4, yBalTop, R - L + 8, 3), fill: C.bhouseTrim, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" }); // top rail
  for (const x of spread(L - 2, R + 2, 32, 1.6)) {
    push({ d: `M ${r(x)} ${r(yBalTop + 2)} L ${r(x)} ${r(yBalBot - 2)}`, stroke: C.bhouseDark, strokeWidth: 1, roughness: 0.6 });
  }
  for (const px of [L - 4, R - 1]) {
    push({ d: rect(px, yBalTop - 1, 5, yBalBot - yBalTop + 1), fill: C.bhouse, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
  }

  return { width: W, height: H, anchorX: W / 2, anchorY: yWater, scale: 0.34, parts };
}

/**
 * The Lafayette Memorial (1917, Daniel Chester French sculptor + Henry Bacon
 * architect), Prospect Park West at the 9th Street entrance. A broad polished
 * pink-granite stele, framed by Corinthian end pilasters under a low segmental
 * coping, carrying French's bronze bas-relief: the Marquis de Lafayette
 * standing in his major-general's uniform, sword-tip to the ground, beside his
 * horse and the African-American groom who braces its bridle. Drawn frontally
 * as the stele on its low terrace, the way it reads from Prospect Park West.
 */
function lafayetteMemorial(): BuildingDrawing {
  const W = 150; // overall (terrace) width
  const DX = 9; // shaded right return for a little mass
  const parts: BuildingPart[] = [];

  let seed = 1000;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical bands (top-down).
  const yCornCtr = 16; // coping crown (the top edge bows up at center)
  const yCorTop = 26; // coping at the ends
  const yCorBot = 40; // bottom of the coping band
  const yInscr = 44; // engraved name band ("THE MARQUIS DE LAFAYETTE")
  const yPanelTop = 56; // top of the bronze relief panel
  const yPanelBot = 116;
  const yBase = 138; // foot of the stele / top of the terrace
  const yStep = 146; // terrace step
  const yWater = 152; // ground

  const L = 14; // stele left edge
  const R = 136; // stele right edge
  const cx = W / 2; // 75
  const pierW = 12; // Corinthian end pilasters
  const pL = L + pierW; // inner edge of the left pilaster
  const pR = R - pierW; // inner edge of the right pilaster

  // A weathered-bronze standing horse in profile (facing left), barrel centered
  // at (hx, hy), drawn a touch lighter than the panel so it reads as relief.
  const reliefHorse = (hx: number, hy: number) => {
    push({ d: ellipse(hx, hy, 15, 8), fill: C.bronze, stroke: C.bronzeDark, strokeWidth: 0.8, roughness: 1, fillStyle: "solid" }); // barrel
    // Neck + head reaching down and forward (left).
    push({
      d:
        `M ${r(hx - 12)} ${r(hy - 4)} Q ${r(hx - 22)} ${r(hy - 7)} ${r(hx - 25)} ${r(hy + 4)} ` +
        `L ${r(hx - 20)} ${r(hy + 6)} Q ${r(hx - 13)} ${r(hy + 2)} ${r(hx - 9)} ${r(hy - 1)} Z`,
      fill: C.bronze,
      stroke: C.bronzeDark,
      strokeWidth: 0.8,
      roughness: 1,
      fillStyle: "solid",
    });
    // Legs (the two near legs slightly forward) and a streaming tail.
    for (const [lx, lift] of [[hx - 9, 0], [hx - 3, 1], [hx + 6, 0], [hx + 11, 1]] as const) {
      push({ d: `M ${r(lx)} ${r(hy + 5)} L ${r(lx)} ${r(hy + 17 - lift)}`, stroke: C.bronzeDark, strokeWidth: 1.8, roughness: 0.9 });
    }
    push({ d: `M ${r(hx + 14)} ${r(hy - 4)} Q ${r(hx + 21)} ${r(hy + 2)} ${r(hx + 18)} ${r(hy + 12)}`, stroke: C.bronzeDark, strokeWidth: 1.4, roughness: 1 });
  };

  // A standing relief figure: head, long coat, legs. `lighter` lifts it off the
  // panel (Lafayette, in higher relief) vs. the dimmer groom behind the horse.
  const figure = (fx: number, headY: number, footY: number, lighter: boolean) => {
    const tone = lighter ? C.bronze : C.bronzeDark;
    push({ d: ellipse(fx, headY, 3, 3.4), fill: tone, stroke: C.bronzeDark, strokeWidth: 0.7, roughness: 0.9, fillStyle: "solid" }); // head
    push({
      d: `M ${r(fx - 3)} ${r(headY + 3)} L ${r(fx + 3)} ${r(headY + 3)} L ${r(fx + 5)} ${r(footY)} L ${r(fx - 5)} ${r(footY)} Z`,
      fill: tone,
      stroke: C.bronzeDark,
      strokeWidth: 0.8,
      roughness: 0.9,
      fillStyle: "solid",
    }); // coat / body
    push({ d: `M ${r(fx - 1.5)} ${r(footY - 1)} L ${r(fx - 1.5)} ${r(footY + 6)}`, stroke: C.bronzeDark, strokeWidth: 1.4, roughness: 0.8 });
    push({ d: `M ${r(fx + 1.5)} ${r(footY - 1)} L ${r(fx + 1.5)} ${r(footY + 6)}`, stroke: C.bronzeDark, strokeWidth: 1.4, roughness: 0.8 });
  };

  // Ground shadow first, so the monument sits on top of it.
  push({
    d: ellipse(cx + 3, yWater + 2, W * 0.56, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Shaded right return, for a touch of depth.
  push({
    d: `M ${r(R)} ${r(yCorTop)} L ${r(R + DX)} ${r(yCorTop + 6)} ` +
      `L ${r(R + DX)} ${r(yBase - 1)} L ${r(R)} ${r(yBase)} Z`,
    fill: C.pgraniteDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });

  // Main pink-granite stele.
  push({
    d: rect(L, yCorTop, R - L, yBase - yCorTop),
    fill: C.pgranite,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    bowing: 0.4,
    fillStyle: "solid",
  });

  // Corinthian end pilasters (lit face + a shaded inner edge + simple cap/base).
  for (const px of [L, pR]) {
    push({ d: rect(px, yCorBot, pierW, yBase - yCorBot), fill: C.stone, stroke: C.ink, strokeWidth: 1.1, roughness: 0.9, fillStyle: "solid" });
    push({ d: rect(px + pierW - 2.5, yCorBot, 2.5, yBase - yCorBot), fill: C.pgraniteDark, stroke: "none", strokeWidth: 0, roughness: 0.9, fillStyle: "solid" });
    for (const fx of spread(px + 1, px + pierW - 1, 2, 1.2)) {
      push({ d: `M ${r(fx)} ${r(yCorBot + 8)} L ${r(fx)} ${r(yBase - 6)}`, stroke: C.graniteDark, strokeWidth: 0.6, roughness: 0.6 });
    }
    push({ d: rect(px - 1.5, yCorBot - 5, pierW + 3, 5), fill: C.stone, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" }); // capital
    push({ d: rect(px - 1, yBase - 5, pierW + 2, 5), fill: C.pgraniteDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" }); // base
  }

  // Low segmental coping: the top edge bows gently up at the center.
  push({
    d:
      `M ${r(L - 5)} ${r(yCorBot)} L ${r(L - 5)} ${r(yCorTop)} ` +
      `Q ${r(cx)} ${r(yCornCtr)} ${r(R + 5)} ${r(yCorTop)} ` +
      `L ${r(R + 5)} ${r(yCorBot)} Z`,
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 0.9,
    fillStyle: "solid",
  });
  push({ d: `M ${r(L - 4)} ${r(yCorTop + 4)} Q ${r(cx)} ${r(yCornCtr + 4)} ${r(R + 4)} ${r(yCorTop + 4)}`, stroke: C.pgraniteDark, strokeWidth: 0.8, roughness: 0.7 });

  // Engraved name band ("THE MARQUIS DE LAFAYETTE"), suggested with tick letters.
  push({ d: rect(pL + 2, yInscr, pR - pL - 4, 7), fill: C.graniteDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  for (const x of spread(pL + 6, pR - 6, 13, 1.6)) {
    push({ d: `M ${r(x)} ${r(yInscr + 1.5)} L ${r(x)} ${r(yInscr + 5.5)}`, stroke: C.stone, strokeWidth: 0.7, roughness: 0.5 });
  }

  // --- Bronze bas-relief panel (recessed, with a light granite surround) ---
  push({ d: rect(pL - 1, yPanelTop - 1, pR - pL + 2, yPanelBot - yPanelTop + 2), fill: C.stone, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" }); // surround
  push({ d: rect(pL + 2, yPanelTop + 2, pR - pL - 4, yPanelBot - yPanelTop - 4), fill: C.recess, stroke: C.ink, strokeWidth: 1.1, roughness: 0.9, fillStyle: "solid" }); // recessed (shadowed) field

  // Magnolia tree tucked into the top-right corner (a soft bronze backdrop).
  push({ d: ellipse(pR - 9, yPanelTop + 13, 7, 9), fill: C.bronze, stroke: "none", strokeWidth: 0, roughness: 1.2, fillStyle: "solid" });

  // The horse, then Lafayette in front of it, then the groom bracing the bridle.
  const groundY = yPanelBot - 14; // the figures' feet line within the panel
  reliefHorse(cx + 14, groundY - 16);
  figure(cx - 10, yPanelTop + 16, groundY, true); // Lafayette (higher relief)
  // Lafayette's sword: tip to the ground at his right.
  push({ d: `M ${r(cx - 5)} ${r(groundY - 12)} L ${r(cx + 2)} ${r(groundY)}`, stroke: C.bronze, strokeWidth: 1, roughness: 0.7 });
  figure(cx + 33, yPanelTop + 22, groundY, true); // groom bracing the bridle
  // Panel ground line.
  push({ d: `M ${r(pL + 4)} ${r(groundY)} L ${r(pR - 4)} ${r(groundY)}`, stroke: C.bronze, strokeWidth: 0.8, roughness: 0.7 });

  // Long dedication inscription on the lower stele (a few faint engraved lines).
  for (const yy of [yPanelBot + 6, yPanelBot + 11, yPanelBot + 16]) {
    push({ d: `M ${r(pL + 6)} ${r(yy)} L ${r(pR - 6)} ${r(yy)}`, stroke: C.pgraniteDark, strokeWidth: 0.6, roughness: 0.6 });
  }

  // --- Low terrace the stele stands on ---
  push({ d: rect(2, yBase, W - 4 + DX, yStep - yBase), fill: C.stone, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(-4, yStep, W + 8 + DX, yWater - yStep), fill: C.pgraniteDark, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(0)} ${r(yStep + 3)} L ${r(W + DX)} ${r(yStep + 3)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });

  return {
    width: W + DX,
    height: yWater + 6,
    anchorX: cx,
    anchorY: yWater,
    scale: 0.34,
    parts,
  };
}

/**
 * Endale Arch (1867–68, Olmsted & Vaux with assistant architect Edward C.
 * Miller): one of the first structures built in Prospect Park, a pedestrian
 * underpass beneath the East Drive that the designers conceived as a portal
 * from Grand Army Plaza into the pastoral Long Meadow. Drawn frontally as its
 * Long-Meadow face (after the c.1870s stereoview): a broad, gently *pointed*
 * two-centred arch whose archivolt is ringed with radiating voussoirs in
 * alternating yellow Berea sandstone and reddish New Jersey brownstone, the
 * tunnel mouth dark with receding orders and a far glimmer of daylight beyond;
 * above it a low, shouldered/stepped raked coping rises to a carved-flower
 * finial at the apex, and the whole portal is set into a planted bank, with
 * dense foliage crowding in on both sides and a broad path fanning out in front.
 */
function endaleArch(): BuildingDrawing {
  const W = 150;
  const parts: BuildingPart[] = [];

  let seed = 1080;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const cx = 75;
  const ys = 96; // springline
  const yGround = 152; // path level at the pier base
  const pierL = 26;
  const pierR = 124;

  // Two-centred (pointed) arch geometry, sampled so we can ring it with real
  // radiating voussoirs and trace the receding orders inside.
  const a = 24; // inner opening half-width
  const ri = 40; // inner archivolt radius
  const ringW = 11;
  const ro = ri + ringW; // outer archivolt radius
  const dIn = ri - a; // centre offset from cx
  const hpIn = Math.sqrt(ri * ri - dIn * dIn); // inner apex rise
  const CRx = cx - dIn; // right-half arc centre (x); centre y is the springline
  const phiTop = Math.atan2(-hpIn, dIn); // apex angle on the right arc

  type Pt = [number, number];
  // Right half of an arc of radius R, from the apex down to the right springer.
  const rightArc = (R: number, n: number): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const phi = phiTop + ((0 - phiTop) * i) / n;
      out.push([CRx + R * Math.cos(phi), ys + R * Math.sin(phi)]);
    }
    return out;
  };
  const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [2 * cx - x, y] as Pt);
  const pathFrom = (pts: Pt[], close = true): string =>
    "M " + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join(" L ") + (close ? " Z" : "");
  // Full inner edge: left springer -> apex -> right springer, at radius R.
  const archEdge = (R: number, n = 12): Pt[] => {
    const right = rightArc(R, n);
    return [...mirror(right).reverse(), ...right.slice(1)];
  };

  // --- Ground shadow ---
  push({ d: ellipse(cx, yGround + 3, W * 0.5, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // --- Planted bank behind/over the tunnel ---
  push({
    d:
      `M ${r(-6)} ${r(yGround)} L ${r(-6)} ${r(66)} ` +
      `Q ${r(28)} ${r(26)} ${r(cx)} ${r(22)} ` +
      `Q ${r(122)} ${r(26)} ${r(W + 6)} ${r(66)} ` +
      `L ${r(W + 6)} ${r(yGround)} Z`,
    fill: C.endaleHill,
    stroke: C.endaleHillDark,
    strokeWidth: 1.2,
    roughness: 1.5,
    bowing: 1.4,
    fillStyle: "solid",
  });
  // Irregular tree clumps along the crest (drawn behind the masonry peak).
  const clump = (bx: number, by: number, s: number) => {
    push({ d: ellipse(bx, by, s, s * 0.9), fill: C.endaleHillDark, stroke: C.stem, strokeWidth: 0.8, roughness: 1.6, fillStyle: "solid" });
    push({ d: ellipse(bx - s * 0.4, by - s * 0.35, s * 0.6, s * 0.55), fill: C.leaf, stroke: "none", strokeWidth: 0, roughness: 1.3, fillStyle: "solid" });
    push({ d: ellipse(bx + s * 0.45, by - s * 0.1, s * 0.5, s * 0.5), fill: C.endaleHill, stroke: "none", strokeWidth: 0, roughness: 1.3, fillStyle: "solid" });
  };
  for (const [bx, by, s] of [
    [20, 44, 13],
    [44, 32, 12],
    [62, 27, 9],
    [cx, 25, 8],
    [92, 28, 10],
    [112, 34, 12],
    [132, 46, 13],
  ] as const) {
    clump(bx, by, s);
  }

  // --- Low battered retaining walls sloping out from the piers ---
  push({ d: `M ${r(4)} ${r(yGround)} L ${r(pierL)} ${r(yGround)} L ${r(pierL)} ${r(ys + 4)} L ${r(4)} ${r(yGround - 12)} Z`, fill: C.bereaDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1.3, bowing: 0.5, fillStyle: "solid" });
  push({ d: `M ${r(W - 4)} ${r(yGround)} L ${r(pierR)} ${r(yGround)} L ${r(pierR)} ${r(ys + 4)} L ${r(W - 4)} ${r(yGround - 12)} Z`, fill: C.bereaDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1.3, bowing: 0.5, fillStyle: "solid" });

  // --- Main facade wall + subtle two-colour banding ---
  const yWallTop = 44; // coping/haunch line
  push({ d: rect(pierL, yWallTop, pierR - pierL, yGround - yWallTop), fill: C.berea, stroke: C.ink, strokeWidth: 1.6, roughness: 1, bowing: 0.3, fillStyle: "solid" });
  for (let y = yWallTop + 9; y < yGround - 4; y += 15) {
    push({ d: rect(pierL, y, pierR - pierL, 6), fill: C.bstone, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }
  push({ d: rect(pierL, yWallTop, pierR - pierL, yGround - yWallTop), fill: "none", stroke: C.ink, strokeWidth: 1.4, roughness: 0.9, bowing: 0.3 });

  // --- Dark tunnel mouth (inner edge of the archivolt down to the path) ---
  const inEdge = archEdge(ri, 12);
  push({ d: pathFrom([[cx - a, yGround] as Pt, ...inEdge, [cx + a, yGround] as Pt]), fill: C.recess, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  // A small far glimmer of daylight at the end of the tunnel (the meadow beyond).
  push({ d: ellipse(cx, yGround - 20, 6, 10), fill: C.warmGlow, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  push({ d: ellipse(cx, yGround - 22, 3.4, 6), fill: "#d7cb9a", stroke: "none", strokeWidth: 0, roughness: 0.9, fillStyle: "solid" });
  // Receding soffit orders (concentric rings stepping into the dark).
  for (const R of [ri - 4, ri - 9]) {
    push({ d: pathFrom(archEdge(R, 12), false), fill: "none", stroke: "#7a6650", strokeWidth: 1.4, roughness: 0.9 });
  }

  // --- Archivolt ring of alternating radiating voussoirs ---
  const nV = 6;
  const rIn = rightArc(ri, nV);
  const rOut = rightArc(ro, nV);
  for (let i = 0; i < nV; i++) {
    const col = i % 2 === 0 ? C.berea : C.bstone;
    push({ d: pathFrom([rIn[i], rIn[i + 1], rOut[i + 1], rOut[i]]), fill: col, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    const lIn = mirror([rIn[i], rIn[i + 1]]);
    const lOut = mirror([rOut[i], rOut[i + 1]]);
    push({ d: pathFrom([lIn[0], lIn[1], lOut[1], lOut[0]]), fill: col, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  }
  // Impost blocks where the arch springs from the piers.
  push({ d: rect(cx - a - ringW, ys - 1, ringW + 2, 5), fill: C.bereaDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(cx + a - 2, ys - 1, ringW + 2, 5), fill: C.bereaDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });

  // --- Low shouldered / stepped raked coping with a flower finial ---
  push({ d: rect(pierL - 3, yWallTop - 4, pierR - pierL + 6, 5), fill: C.bereaDark, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" }); // coping ledge
  const gable: Pt[] = [
    [cx - 33, yWallTop - 4],
    [cx - 33, yWallTop - 10],
    [cx - 20, yWallTop - 10],
    [cx - 20, yWallTop - 17],
    [cx, yWallTop - 26],
    [cx + 20, yWallTop - 17],
    [cx + 20, yWallTop - 10],
    [cx + 33, yWallTop - 10],
    [cx + 33, yWallTop - 4],
  ];
  push({ d: pathFrom(gable), fill: C.berea, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
  push({ d: pathFrom([[cx - 20, yWallTop - 13] as Pt, [cx + 20, yWallTop - 13] as Pt, [cx + 20, yWallTop - 10] as Pt, [cx - 20, yWallTop - 10] as Pt]), fill: C.bstone, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" }); // accent band
  // Carved flower (rosette) at the apex.
  const fy = yWallTop - 30;
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2;
    push({ d: ellipse(cx + Math.cos(ang) * 3.2, fy + Math.sin(ang) * 3.2, 1.7, 1.7), fill: C.berea, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
  }
  push({ d: ellipse(cx, fy, 2.4, 2.4), fill: C.bstone, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });

  // --- Dense foliage banks crowding the outer corners (over the wall edges) ---
  for (const [bx, by, s] of [
    [17, 92, 14],
    [15, 116, 12],
    [30, 132, 11],
    [133, 92, 14],
    [135, 116, 12],
    [120, 132, 11],
  ] as const) {
    clump(bx, by, s);
  }

  // --- Broad path fanning out in front of the portal ---
  push({ d: pathFrom([[cx - a, yGround - 1] as Pt, [cx + a, yGround - 1] as Pt, [pierR + 12, yGround + 9] as Pt, [pierL - 12, yGround + 9] as Pt]), fill: "#e1d3b1", stroke: "none", strokeWidth: 0, roughness: 1.2, fillStyle: "solid" });
  push({ d: `M ${r(pierL - 10)} ${r(yGround + 2)} L ${r(pierR + 10)} ${r(yGround + 2)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.8 });

  return {
    width: W,
    height: yGround + 10,
    anchorX: cx,
    anchorY: yGround,
    scale: 0.24,
    parts,
  };
}

/**
 * The Brooklyn Museum (McKim, Mead & White, 1895–1915) at 200 Eastern Parkway:
 * a monumental Beaux-Arts temple front in pale limestone. Drawn frontally as its
 * signature elevation — a great central portico of tall Ionic columns standing
 * on the iconic monumental front staircase (the one removed in 1934), carrying a
 * full entablature and a sculptured triangular pediment, flanked by lower two-
 * story pavilion wings with rows of windows.
 */
function brooklynMuseum(): BuildingDrawing {
  const W = 184;
  const parts: BuildingPart[] = [];

  let seed = 920;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  // Vertical bands (top-down).
  const yPedApex = 16; // peak of the pediment
  const yEntTop = 44; // pediment base / top of the entablature
  const yEntBot = 56; // column capitals / bottom of the entablature
  const yColTop = 56;
  const yColBot = 108; // stylobate: columns stand on the top step
  const yWingTop = 50; // flanking wing parapet (just below the portico cornice)
  const yBase = 142; // top of the terrace
  const yWater = 150; // ground

  const L = 6;
  const R = 178; // outer wall edges
  const cpL = 56; // central portico sides
  const cpR = 128;
  const cx = (cpL + cpR) / 2; // 92

  // A tapered Ionic column standing between `topY` and `botY`, centered on `cx`.
  const column = (colCx: number, w: number, lit: boolean) => {
    const half = w / 2;
    const topHalf = half * 0.84; // slight entasis: narrower at the top
    const wall = lit ? C.stone : C.stoneDark;
    push({
      d:
        `M ${r(colCx - half)} ${r(yColBot)} ` +
        `L ${r(colCx - topHalf)} ${r(yColTop)} ` +
        `L ${r(colCx + topHalf)} ${r(yColTop)} ` +
        `L ${r(colCx + half)} ${r(yColBot)} Z`,
      fill: wall,
      stroke: C.ink,
      strokeWidth: 1,
      roughness: 0.8,
      fillStyle: "solid",
    });
    // A couple of fine flutes.
    for (const fx of [colCx - half * 0.4, colCx + half * 0.4]) {
      push({ d: `M ${r(fx)} ${r(yColTop + 3)} L ${r(fx)} ${r(yColBot - 2)}`, stroke: C.stoneDark, strokeWidth: 0.5, roughness: 0.6 });
    }
    // Base block.
    push({ d: rect(colCx - half - 1, yColBot - 3, w + 2, 3), fill: C.stoneDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
    // Capital with two little volute scrolls.
    push({ d: rect(colCx - half - 1.5, yColTop - 3, w + 3, 3), fill: wall, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
    push({ d: ellipse(colCx - topHalf, yColTop - 1.2, 1.9, 1.5), fill: wall, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
    push({ d: ellipse(colCx + topHalf, yColTop - 1.2, 1.9, 1.5), fill: wall, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
  };

  // Ground shadow first.
  push({
    d: ellipse(W / 2, yWater + 2, W * 0.52, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // --- Flanking pavilion wings (left lit, right shaded) ---
  push({ d: rect(cpR, yWingTop, R - cpR, yBase - yWingTop), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1.6, roughness: 1, bowing: 0.3, fillStyle: "solid" }); // right
  push({ d: rect(L, yWingTop, cpL - L, yBase - yWingTop), fill: C.stone, stroke: C.ink, strokeWidth: 1.6, roughness: 1, bowing: 0.3, fillStyle: "solid" }); // left
  // Wing cornices (overhang) + a thin attic course suggesting the inscribed names.
  push({ d: rect(L - 2, yWingTop - 4, cpL - L + 4, 4), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(cpR - 2, yWingTop - 4, R - cpR + 4, 4), fill: C.roofDark, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  for (const [wl, wr] of [[L + 4, cpL - 4], [cpR + 4, R - 4]] as const) {
    push({ d: `M ${r(wl)} ${r(yWingTop - 2)} L ${r(wr)} ${r(yWingTop - 2)}`, stroke: C.stoneDark, strokeWidth: 0.5, roughness: 0.6 });
  }
  // Two stories of windows in each wing.
  for (const [wl, wr, lit] of [[L + 5, cpL - 5, true], [cpR + 5, R - 5, false]] as const) {
    for (const wy of [yWingTop + 12, yWingTop + 50]) {
      for (const wx of spread(wl, wr, 3, 9)) {
        push({ d: rect(wx, wy, 9, 22), fill: C.recess, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
        push({ d: rect(wx - 1.5, wy - 3, 12, 3), fill: lit ? C.stone : C.stoneDark, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7, fillStyle: "solid" }); // lintel
      }
    }
  }

  // --- Central portico: deep shadowed cella wall behind the columns ---
  push({ d: rect(cpL + 2, yEntBot, cpR - cpL - 4, yColBot - yEntBot), fill: C.recess, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  // Three tall bronze entrance doors at the back of the portico.
  for (const dx of spread(cpL + 8, cpR - 8, 3, 9)) {
    push({ d: rect(dx, yColBot - 26, 9, 26), fill: C.bronzeDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });
  }

  // --- The monumental front staircase (wider at the bottom) ---
  push({
    d:
      `M ${r(cpL - 12)} ${r(yBase)} L ${r(cpL)} ${r(yColBot)} ` +
      `L ${r(cpR)} ${r(yColBot)} L ${r(cpR + 12)} ${r(yBase)} Z`,
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 1,
    fillStyle: "solid",
  });
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const yy = yColBot + (yBase - yColBot) * t;
    const lx = cpL - 12 * t;
    const rx = cpR + 12 * t;
    push({ d: `M ${r(lx)} ${r(yy)} L ${r(rx)} ${r(yy)}`, stroke: C.stoneDark, strokeWidth: 0.7, roughness: 0.6 });
  }

  // --- Columns (six across the portico) ---
  for (const [i, sx] of spread(cpL + 4, cpR - 4, 6, 6).entries()) {
    column(sx + 3, 6, i < 3); // the right half reads slightly shaded
  }

  // --- Entablature over the columns ---
  push({ d: rect(cpL - 3, yEntTop, cpR - cpL + 6, yEntBot - yEntTop), fill: C.stone, stroke: C.ink, strokeWidth: 1.5, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(cpL, yEntTop + 5, cpR - cpL, 4), fill: C.stoneDark, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7, fillStyle: "solid" }); // frieze panel (inscription)
  push({ d: rect(cpL - 6, yEntBot - 2, cpR - cpL + 12, 3), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" }); // overhanging cornice shelf

  // --- Pediment with allegorical sculpture in the tympanum ---
  push({
    d: `M ${r(cpL - 6)} ${r(yEntTop)} L ${r(cx)} ${r(yPedApex)} L ${r(cpR + 6)} ${r(yEntTop)} Z`,
    fill: C.stone,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    fillStyle: "solid",
  });
  // Raking cornice (a thin inner line under each slope).
  push({ d: `M ${r(cpL - 2)} ${r(yEntTop - 1.5)} L ${r(cx)} ${r(yPedApex + 4)} L ${r(cpR + 2)} ${r(yEntTop - 1.5)}`, stroke: C.stoneDark, strokeWidth: 0.7, roughness: 0.6 });
  // Tympanum figures: a standing central figure flanked by two reclining ones.
  push({ d: `M ${r(cx - 2.2)} ${r(yEntTop - 3)} L ${r(cx + 2.2)} ${r(yEntTop - 3)} L ${r(cx + 1.4)} ${r(yPedApex + 8)} L ${r(cx - 1.4)} ${r(yPedApex + 8)} Z`, fill: C.bronze, stroke: C.ink, strokeWidth: 0.8, roughness: 0.9, fillStyle: "solid" });
  push({ d: ellipse(cx, yPedApex + 6, 2, 2.3), fill: C.bronze, stroke: C.ink, strokeWidth: 0.6, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(cx - 16, yEntTop - 5, 7, 3.2), fill: C.bronze, stroke: C.ink, strokeWidth: 0.7, roughness: 0.9, fillStyle: "solid" });
  push({ d: ellipse(cx + 16, yEntTop - 5, 7, 3.2), fill: C.bronze, stroke: C.ink, strokeWidth: 0.7, roughness: 0.9, fillStyle: "solid" });
  // Acroteria at the pediment corners and apex.
  for (const ax of [cpL - 6, cx, cpR + 6]) {
    push({ d: ellipse(ax, ax === cx ? yPedApex - 2 : yEntTop - 2, 1.8, 2.4), fill: C.stoneDark, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  }

  // --- Terrace / plinth across the front (drawn last, in front) ---
  push({ d: rect(L - 5, yBase, R - L + 10, yWater - yBase), fill: C.stoneDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(L - 3)} ${r(yBase + 4)} L ${r(R + 3)} ${r(yBase + 4)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7 });

  return {
    width: W,
    height: yWater + 6,
    anchorX: W / 2,
    anchorY: yWater,
    scale: 0.42,
    parts,
  };
}

/**
 * The Brooklyn Botanic Garden (founded 1910). Not a building, so it's drawn
 * abstractly: a low planted mound massed with stylized blossom clusters in
 * cherry-blossom pink and mixed border colors, with two slender cherry branches
 * arching above and a few petals drifting down — a little illustrated flower
 * bed rather than a literal place.
 */
function botanicGarden(): BuildingDrawing {
  const W = 92;
  const H = 92;
  const parts: BuildingPart[] = [];

  let seed = 1200;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const cx = W / 2; // 46
  const groundY = H - 3; // 89

  // A single stylized blossom cluster: five outer lobes (petals) around a disc,
  // capped by a warm center — reads as an abstract flower head.
  const bloom = (px: number, py: number, R: number, fill: string, dark: string) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      push({
        d: ellipse(px + Math.cos(a) * R * 0.6, py + Math.sin(a) * R * 0.6, R * 0.5, R * 0.5),
        fill,
        stroke: dark,
        strokeWidth: 1,
        roughness: 1.15,
        bowing: 1.1,
        fillStyle: "solid",
      });
    }
    push({ d: ellipse(px, py, R * 0.6, R * 0.6), fill, stroke: dark, strokeWidth: 1, roughness: 1.1, fillStyle: "solid" });
    push({ d: ellipse(px, py, R * 0.2, R * 0.2), fill: C.gCenter, stroke: "none", strokeWidth: 0, roughness: 0.8, fillStyle: "solid" });
  };

  // Ground shadow first, so the bed sits on top of it.
  push({ d: ellipse(cx, groundY + 1, 40, 6), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // Two slender cherry branches arching up from behind the mound (drawn first so
  // the mound covers their roots). Bare twigs with pink blossom puffs at the tips.
  push({ d: `M 40 66 C 35 48 30 34 27 20`, stroke: C.gTwig, strokeWidth: 2.4, roughness: 1.3, bowing: 1.4 });
  push({ d: `M 33 38 C 28 34 24 33 20 33`, stroke: C.gTwig, strokeWidth: 1.4, roughness: 1.2, bowing: 1.2 });
  push({ d: `M 54 64 C 59 48 64 36 67 25`, stroke: C.gTwig, strokeWidth: 2.2, roughness: 1.3, bowing: 1.4 });
  push({ d: `M 62 40 C 67 37 71 37 74 38`, stroke: C.gTwig, strokeWidth: 1.3, roughness: 1.2, bowing: 1.2 });
  bloom(26, 18, 9, C.gPink, C.gPinkDark);
  bloom(20, 32, 6, C.gPink, C.gPinkDark);
  bloom(68, 22, 8, C.gPink, C.gPinkDark);
  bloom(75, 37, 5.5, C.gPink, C.gPinkDark);

  // The planted mound (the garden bed) over the branch roots.
  push({
    d: `M 5 ${groundY} C 9 62 28 50 ${cx} 50 C 64 50 83 62 87 ${groundY} Z`,
    fill: C.gLeaf,
    stroke: C.gLeafDark,
    strokeWidth: 1.6,
    roughness: 1.6,
    bowing: 1.3,
    fillStyle: "solid",
  });
  // Shaded base of the mound for depth.
  push({ d: `M 9 ${groundY} C 18 ${groundY - 8} 70 ${groundY - 8} 83 ${groundY} Z`, fill: C.gLeafDeep, stroke: "none", strokeWidth: 0, roughness: 1.4, fillStyle: "solid" });
  // A few foliage ticks across the mound.
  for (const [tx, ty] of [[16, 70], [30, 62], [60, 62], [76, 70], [46, 60]] as const) {
    push({ d: `M ${tx} ${ty} l -2 -6 M ${tx} ${ty} l 2 -6`, stroke: C.gLeafDark, strokeWidth: 1, roughness: 1.1 });
  }

  // The flower beds: a scatter of mixed blossom clusters massed on the mound.
  bloom(30, 58, 8, C.gLilac, C.gLilacDark);
  bloom(46, 54, 9, C.gPink, C.gPinkDark);
  bloom(61, 58, 8, C.gGold, C.gGoldDark);
  bloom(20, 68, 7, C.gCoral, C.gCoralDark);
  bloom(38, 70, 8, C.gGold, C.gGoldDark);
  bloom(54, 70, 8, C.gLilac, C.gLilacDark);
  bloom(70, 67, 7, C.gPink, C.gPinkDark);

  // A few petals drifting down.
  for (const [pxp, pyp] of [[40, 30], [50, 42], [33, 48]] as const) {
    push({ d: ellipse(pxp, pyp, 1.8, 1.2), fill: C.gPink, stroke: "none", strokeWidth: 0, roughness: 0.8, fillStyle: "solid" });
  }

  return { width: W, height: H, anchorX: cx, anchorY: groundY, scale: 0.5, parts };
}

/**
 * The Prospect Park Zoo (1935, Aymar Embury II), Flatbush Avenue — the WPA
 * sea-lion court at the heart of the semi-circular plan. Drawn as the view
 * into the circular pool from the plaza: red-brick and limestone-trimmed
 * pavilions fanning behind, the domed Animal Lifestyles building at center,
 * a Jungle Book bas-relief panel above the arch, and a California sea lion
 * barking from its rock in the pool.
 */
function prospectParkZoo(): BuildingDrawing {
  const W = 152;
  const H = 142;
  const parts: BuildingPart[] = [];

  let seed = 1320;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const cx = W / 2; // 76
  const groundY = H - 4; // 138
  const yPoolCy = 108;
  const poolRx = 62;
  const poolRy = 20;
  const yPoolFront = yPoolCy + poolRy;
  const yPoolBack = yPoolCy - poolRy;
  const yBldgBase = yPoolBack + 2;

  // Ground shadow first.
  push({
    d: ellipse(cx, groundY + 1, poolRx + 6, 8),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Park trees flanking the court (drawn first, behind the pavilions).
  for (const [tx, ty, trx, try_] of [[16, 46, 11, 15], [136, 48, 10, 14], [6, 62, 8, 11], [146, 64, 8, 11]] as const) {
    push({ d: ellipse(tx, ty, trx, try_), fill: C.endaleHill, stroke: C.endaleHillDark, strokeWidth: 0.8, roughness: 1.3, fillStyle: "solid" });
  }

  // --- Background pavilions fanning around the court ---
  const pavilion = (x0: number, x1: number, topY: number, lit: boolean) => {
    const wall = lit ? C.brick : C.brickDark;
    push({
      d: `M ${r(x0)} ${r(yBldgBase)} L ${r(x0 + 3)} ${r(topY + 10)} L ${r(x1 - 3)} ${r(topY + 8)} L ${r(x1)} ${r(yBldgBase)} Z`,
      fill: wall,
      stroke: C.ink,
      strokeWidth: 1.2,
      roughness: 0.95,
      fillStyle: "solid",
    });
    push({
      d: `M ${r(x0 + 2)} ${r(topY + 10)} L ${r(x1 - 2)} ${r(topY + 8)} L ${r(x1 - 2)} ${r(topY + 14)} L ${r(x0 + 2)} ${r(topY + 16)} Z`,
      fill: C.zooStone,
      stroke: C.ink,
      strokeWidth: 0.9,
      roughness: 0.8,
      fillStyle: "solid",
    });
    for (const wx of spread(x0 + 5, x1 - 13, 2, 10)) {
      push({ d: archWindow(wx, topY + 22, 10, yBldgBase - topY - 24), fill: C.glass, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
      push({ d: rect(wx - 1, topY + 20, 12, 3), fill: C.zooStone, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
    }
  };
  pavilion(4, 46, 52, true);
  pavilion(106, 148, 52, false);

  // Center domed pavilion (the old Elephant House / Animal Lifestyles).
  const cL = 44;
  const cR = 108;
  const yDomeApex = 6;
  const yDomeBase = 34;
  const yFrieze = 38;
  const yWinTop = 48;
  const yWinBot = 72;
  const yReliefTop = 74;
  const yReliefBot = 86;
  const yArchTop = 88;
  push({
    d: rect(cL, yFrieze, cR - cL, yBldgBase - yFrieze),
    fill: C.brick,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 0.9,
    fillStyle: "solid",
  });
  // Shallow dome + side chimney caps (as on the vintage postcard).
  push({
    d:
      `M ${r(cL + 8)} ${r(yDomeBase)} A ${r(28)} ${r(18)} 0 0 1 ${r(cR - 8)} ${r(yDomeBase)} ` +
      `L ${r(cR - 12)} ${r(yDomeBase + 4)} A ${r(24)} ${r(14)} 0 0 0 ${r(cL + 12)} ${r(yDomeBase + 4)} Z`,
    fill: C.zooStoneDark,
    stroke: C.ink,
    strokeWidth: 1.1,
    roughness: 0.85,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(cL + 8)} ${r(yDomeBase)} A ${r(28)} ${r(18)} 0 0 1 ${r(cR - 8)} ${r(yDomeBase)} Z`,
    fill: C.zooStone,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 0.85,
    fillStyle: "solid",
  });
  for (const tx of [cL + 2, cR - 8]) {
    push({ d: rect(tx, yDomeApex + 4, 7, yDomeBase - yDomeApex), fill: C.brickDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
    push({ d: rect(tx - 1, yDomeApex, 9, 5), fill: C.zooStone, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  }
  push({ d: rect(cL - 2, yFrieze - 4, cR - cL + 4, 5), fill: C.zooStone, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  for (const ox of spread(cL + 8, cR - 16, 5, 6)) {
    push({ d: ellipse(ox + 3, yFrieze - 1, 2.5, 2.5), fill: C.glass, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7, fillStyle: "solid" });
  }
  for (const wx of spread(cL + 6, cR - 18, 4, 11)) {
    push({ d: rect(wx - 1, yWinTop - 2, 13, yWinBot - yWinTop + 4), fill: C.zooStone, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
    push({ d: rect(wx, yWinTop, 11, yWinBot - yWinTop), fill: C.glass, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
  }
  // F. G. R. Roth Jungle Book bas-relief panel over the central arch.
  push({ d: rect(cL + 18, yReliefTop, cR - cL - 36, yReliefBot - yReliefTop), fill: C.bronzeDark, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  push({ d: ellipse(cL + 36, yReliefTop + 8, 4, 3.5), fill: C.bronze, stroke: C.bronzeDark, strokeWidth: 0.7, roughness: 0.9, fillStyle: "solid" }); // Mowgli head
  push({ d: `M ${r(cL + 30)} ${r(yReliefTop + 10)} L ${r(cL + 42)} ${r(yReliefTop + 10)} L ${r(cL + 40)} ${r(yReliefBot - 1)} L ${r(cL + 32)} ${r(yReliefBot - 1)} Z`, fill: C.bronze, stroke: C.bronzeDark, strokeWidth: 0.7, roughness: 0.9, fillStyle: "solid" }); // boy
  push({ d: `M ${r(cL + 48)} ${r(yReliefTop + 9)} Q ${r(cL + 56)} ${r(yReliefTop + 6)} ${r(cL + 58)} ${r(yReliefTop + 11)} L ${r(cL + 54)} ${r(yReliefBot - 1)} L ${r(cL + 46)} ${r(yReliefBot - 1)} Z`, fill: C.bronze, stroke: C.bronzeDark, strokeWidth: 0.7, roughness: 0.9, fillStyle: "solid" }); // wolf
  push({ d: archWindow(cL + 28, yArchTop, cR - cL - 56, yBldgBase - yArchTop - 2), fill: C.recess, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });

  // --- Circular sea-lion pool ---
  push({ d: ellipse(cx, yPoolCy, poolRx, poolRy), fill: C.zooStoneDark, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" }); // coping rim
  push({ d: ellipse(cx, yPoolCy + 1, poolRx - 4, poolRy - 3), fill: "rgba(159,183,172,0.88)", stroke: "none", strokeWidth: 0, roughness: 1.1, fillStyle: "solid" }); // water
  push({ d: ellipse(cx, yPoolCy + 5, 20, 5), fill: "rgba(232,224,204,0.22)", stroke: "none", strokeWidth: 0, roughness: 1.2, fillStyle: "solid" }); // dome reflection
  for (const [ox, oy, orx, ory] of [[cx - 24, yPoolCy + 2, 14, 4], [cx + 28, yPoolCy + 1, 10, 3]] as const) {
    push({ d: ellipse(ox, oy, orx, ory), fill: "rgba(255,255,255,0.22)", stroke: "none", strokeWidth: 0, roughness: 1.2, fillStyle: "solid" });
  }

  // Granite rock island.
  const rockCy = yPoolCy - 2;
  push({
    d:
      `M ${r(cx - 22)} ${r(rockCy + 14)} C ${r(cx - 18)} ${r(rockCy - 8)} ${r(cx - 4)} ${r(rockCy - 14)} ${r(cx + 2)} ${r(rockCy - 12)} ` +
      `C ${r(cx + 16)} ${r(rockCy - 10)} ${r(cx + 24)} ${r(rockCy + 2)} ${r(cx + 20)} ${r(rockCy + 14)} Z`,
    fill: C.zooRock,
    stroke: C.zooRockDark,
    strokeWidth: 1.3,
    roughness: 1.05,
    bowing: 0.5,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(cx - 14)} ${r(rockCy + 12)} C ${r(cx - 2)} ${r(rockCy + 2)} ${r(cx + 12)} ${r(rockCy + 4)} ${r(cx + 16)} ${r(rockCy + 12)} Z`,
    fill: C.zooRockDark,
    stroke: "none",
    strokeWidth: 0,
    roughness: 1,
    fillStyle: "solid",
  });

  // California sea lion in the classic barking pose — chest up, head back, flippers spread.
  const sx = cx - 2;
  const sy = rockCy + 2;
  // Tail curling on the rock behind the body.
  push({
    d: `M ${r(sx + 14)} ${r(sy + 10)} Q ${r(sx + 24)} ${r(sy + 8)} ${r(sx + 22)} ${r(sy + 16)} Q ${r(sx + 16)} ${r(sy + 18)} ${r(sx + 10)} ${r(sy + 14)}`,
    fill: "none",
    stroke: C.seaLionDark,
    strokeWidth: 3.2,
    roughness: 1,
    bowing: 1.2,
  });
  // Haunches and belly on the rock.
  push({
    d:
      `M ${r(sx - 16)} ${r(sy + 12)} Q ${r(sx - 8)} ${r(sy + 18)} ${r(sx + 8)} ${r(sy + 16)} ` +
      `Q ${r(sx + 16)} ${r(sy + 10)} ${r(sx + 10)} ${r(sy + 4)} Q ${r(sx - 2)} ${r(sy + 2)} ${r(sx - 12)} ${r(sy + 6)} Z`,
    fill: C.seaLionDark,
    stroke: C.ink,
    strokeWidth: 1,
    roughness: 1,
    fillStyle: "solid",
  });
  // Raised chest and neck.
  push({
    d:
      `M ${r(sx - 12)} ${r(sy + 6)} Q ${r(sx - 10)} ${r(sy - 8)} ${r(sx - 4)} ${r(sy - 18)} ` +
      `Q ${r(sx + 2)} ${r(sy - 10)} ${r(sx + 4)} ${r(sy + 2)} Q ${r(sx - 2)} ${r(sy + 4)} ${r(sx - 12)} ${r(sy + 6)} Z`,
    fill: C.seaLion,
    stroke: C.seaLionDark,
    strokeWidth: 1.1,
    roughness: 1,
    fillStyle: "solid",
  });
  push({ d: ellipse(sx - 2, sy + 4, 9, 7), fill: C.seaLionBelly, stroke: "none", strokeWidth: 0, roughness: 0.9, fillStyle: "solid" });
  // Head thrown back, mouth open.
  push({
    d:
      `M ${r(sx - 4)} ${r(sy - 18)} Q ${r(sx - 12)} ${r(sy - 28)} ${r(sx - 18)} ${r(sy - 24)} ` +
      `Q ${r(sx - 22)} ${r(sy - 18)} ${r(sx - 16)} ${r(sy - 14)} Q ${r(sx - 8)} ${r(sy - 14)} ${r(sx - 4)} ${r(sy - 18)} Z`,
    fill: C.seaLion,
    stroke: C.seaLionDark,
    strokeWidth: 1,
    roughness: 0.95,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(sx - 18)} ${r(sy - 22)} Q ${r(sx - 20)} ${r(sy - 18)} ${r(sx - 14)} ${r(sy - 16)} Q ${r(sx - 12)} ${r(sy - 20)} ${r(sx - 18)} ${r(sy - 22)} Z`,
    fill: C.recess,
    stroke: "none",
    strokeWidth: 0,
    roughness: 0.8,
    fillStyle: "solid",
  }); // open mouth
  push({ d: ellipse(sx - 13, sy - 21, 1.3, 1.3), fill: C.ink, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  for (const [wy, dx] of [[-19, -22], [-17, -24], [-15, -23], [-19, -8], [-17, -6], [-15, -7]] as const) {
    push({ d: `M ${r(sx + dx)} ${r(sy + wy)} L ${r(sx + dx - 5)} ${r(sy + wy + (wy < -16 ? -1 : 1))}`, stroke: C.ink, strokeWidth: 0.45, roughness: 0.7 });
  }
  // Front flippers spread on the rock.
  push({
    d: `M ${r(sx - 10)} ${r(sy + 8)} Q ${r(sx - 22)} ${r(sy + 14)} ${r(sx - 20)} ${r(sy + 20)} L ${r(sx - 8)} ${r(sy + 14)} Z`,
    fill: C.seaLion,
    stroke: C.seaLionDark,
    strokeWidth: 0.9,
    roughness: 0.95,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(sx + 6)} ${r(sy + 8)} Q ${r(sx + 18)} ${r(sy + 12)} ${r(sx + 16)} ${r(sy + 18)} L ${r(sx + 4)} ${r(sy + 12)} Z`,
    fill: C.seaLion,
    stroke: C.seaLionDark,
    strokeWidth: 0.9,
    roughness: 0.95,
    fillStyle: "solid",
  });

  // Low wrought-iron fence arc in front of the pool.
  push({ d: `M ${r(10)} ${r(yPoolFront + 4)} Q ${r(cx)} ${r(yPoolFront + 10)} ${r(W - 10)} ${r(yPoolFront + 4)}`, stroke: C.zooFence, strokeWidth: 1.2, roughness: 0.9, bowing: 1.1 });
  for (const fx of spread(14, W - 14, 11, 1)) {
    push({ d: `M ${r(fx)} ${r(yPoolFront + 3)} L ${r(fx)} ${r(yPoolFront + 9)}`, stroke: C.zooFence, strokeWidth: 0.7, roughness: 0.7 });
  }

  // A splash and ripple where the tail meets the water.
  push({ d: ellipse(sx + 24, yPoolCy + 8, 6, 2.5), fill: "rgba(255,255,255,0.4)", stroke: "none", strokeWidth: 0, roughness: 1.3, fillStyle: "solid" });
  push({ d: `M ${r(sx + 18)} ${r(yPoolCy + 10)} Q ${r(sx + 24)} ${r(yPoolCy + 7)} ${r(sx + 30)} ${r(yPoolCy + 10)}`, stroke: C.waterDark, strokeWidth: 0.8, roughness: 1.2, bowing: 1.2 });

  return { width: W, height: H, anchorX: cx, anchorY: groundY, scale: 0.4, parts };
}

/**
 * Congregation Beth Elohim (1909–1910, Simon Eisendrath & B. Horowitz), Garfield
 * Place at Eighth Avenue — the "Garfield Temple" or "Eighth Avenue Temple." A
 * Classical Revival Reform synagogue in Indiana limestone on a faceted octagonal
 * plan. Drawn from Garfield Place: two Ionic columns flanking a great round-
 * arched stained-glass window beneath an inscribed entablature and pediment,
 * with a ribbed copper dome and Star of David rising above the clerestory drum;
 * angled wings with arched windows and pediments; menorahs flanking the steps.
 */
function bethElohim(): BuildingDrawing {
  const W = 152;
  const parts: BuildingPart[] = [];

  let seed = 1280;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 182;
  const yBase = 174;
  const yStepTop = 156;
  const cx = 76;

  const cL = 38;
  const cR = 114;
  const yColBot = 156;
  const yColTop = 48;
  const yEntTop = 42;
  const yEntBot = 54;
  const yPedApex = 16;
  const yDrumBot = 54;
  const yDrumTop = 34;
  const yDoorTop = 136;

  const domeCopper = "#6b8a72";
  const domeCopperDark = "#4f6d58";

  const ionicColumn = (colCx: number, lit: boolean) => {
    const w = 9;
    const half = w / 2;
    const topHalf = half * 0.82;
    const wall = lit ? C.lime : C.limeDark;
    push({
      d:
        `M ${r(colCx - half)} ${r(yColBot)} ` +
        `L ${r(colCx - topHalf)} ${r(yColTop)} ` +
        `L ${r(colCx + topHalf)} ${r(yColTop)} ` +
        `L ${r(colCx + half)} ${r(yColBot)} Z`,
      fill: wall,
      stroke: C.ink,
      strokeWidth: 1.2,
      roughness: 0.8,
      fillStyle: "solid",
    });
    for (const fx of [colCx - half * 0.32, colCx, colCx + half * 0.32]) {
      push({ d: `M ${r(fx)} ${r(yColTop + 5)} L ${r(fx)} ${r(yColBot - 4)}`, stroke: C.limeDark, strokeWidth: 0.45, roughness: 0.6 });
    }
    push({ d: rect(colCx - half - 2, yColTop - 6, w + 4, 6), fill: wall, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
    push({ d: ellipse(colCx - topHalf + 1.2, yColTop - 2.5, 2.2, 1.6), fill: wall, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
    push({ d: ellipse(colCx + topHalf - 1.2, yColTop - 2.5, 2.2, 1.6), fill: wall, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
    push({ d: rect(colCx - half - 2, yColBot - 5, w + 4, 5), fill: C.limeDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
  };

  const wingPediment = (left: number, right: number, baseY: number, apexY: number, lit: boolean) => {
    const wcx = (left + right) / 2;
    const wall = lit ? C.lime : C.limeDark;
    push({ d: rect(left, baseY, right - left, 5), fill: wall, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(left - 1)} ${r(baseY)} L ${r(wcx)} ${r(apexY)} L ${r(right + 1)} ${r(baseY)} Z`, fill: wall, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  };

  const menorah = (mx: number, footY: number) => {
    push({ d: rect(mx - 4, footY - 3, 8, 3), fill: C.limeDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(mx)} ${r(footY - 3)} L ${r(mx)} ${r(footY - 22)}`, stroke: C.ink, strokeWidth: 1.8, roughness: 0.8 });
    for (const [by, span] of [[footY - 8, 5], [footY - 13, 7], [footY - 18, 9]] as const) {
      push({ d: `M ${r(mx - span / 2)} ${r(by)} L ${r(mx + span / 2)} ${r(by)}`, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8 });
    }
    push({ d: `M ${r(mx)} ${r(footY - 22)} L ${r(mx)} ${r(footY - 26)}`, stroke: C.ink, strokeWidth: 1.2, roughness: 0.7 });
  };

  push({ d: ellipse(W / 2, yWater + 2, W * 0.56, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  push({
    d: `M ${r(0)} ${r(yBase)} L ${r(0)} ${r(88)} L ${r(cL)} ${r(yColBot)} L ${r(cL)} ${r(yBase)} Z`,
    fill: C.lime,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(cR)} ${r(yBase)} L ${r(cR)} ${r(yColBot)} L ${r(W)} ${r(88)} L ${r(W)} ${r(yBase)} Z`,
    fill: C.limeDark,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 1,
    fillStyle: "solid",
  });
  const wingWin = (wx: number, lit: boolean) => {
    push({ d: rect(wx - 2, 100, 22, 4), fill: lit ? C.limeDark : C.lime, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
    push({ d: archWindow(wx, 104, 18, 38), fill: C.glass, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(wx + 9)} ${r(116)} L ${r(wx + 9)} ${r(138)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.5 });
    for (const ox of [wx + 3, wx + 15]) {
      push({ d: `M ${r(ox)} ${r(116)} L ${r(ox)} ${r(138)}`, stroke: C.ink, strokeWidth: 0.5, roughness: 0.5 });
    }
  };
  wingWin(8, true);
  wingPediment(4, 34, 92, 76, true);
  wingWin(cR + 8, false);
  wingPediment(cR + 4, W - 4, 92, 76, false);

  push({ d: rect(cL + 2, yDrumBot, cR - cL - 4, yColBot - yDrumBot), fill: C.lime, stroke: C.ink, strokeWidth: 1.3, roughness: 1, fillStyle: "solid" });
  push({ d: rect(cR - 9, yDrumBot, 9, yColBot - yDrumBot), fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });

  push({ d: rect(cx - 26, yDrumTop, 52, yDrumBot - yDrumTop), fill: C.lime, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  for (const wx of spread(cx - 20, cx + 8, 5, 6)) {
    push({ d: archWindow(wx, yDrumTop + 3, 5, 12), fill: C.glass, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  }

  const domeRx = 32;
  const domeRy = 22;
  const yDomeBase = yDrumTop;
  const yDomeApex = 2;
  push({
    d: `M ${r(cx - domeRx)} ${r(yDomeBase)} A ${r(domeRx)} ${r(domeRy)} 0 0 1 ${r(cx + domeRx)} ${r(yDomeBase)} Z`,
    fill: domeCopper,
    stroke: C.ink,
    strokeWidth: 1.5,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(cx)} ${r(yDomeApex)} A ${r(domeRx)} ${r(domeRy)} 0 0 1 ${r(cx + domeRx)} ${r(yDomeBase)} L ${r(cx)} ${r(yDomeBase)} Z`,
    fill: domeCopperDark,
    stroke: "none",
    strokeWidth: 0,
    roughness: 1,
    fillStyle: "solid",
  });
  for (let i = -2; i <= 2; i++) {
    push({
      d: `M ${r(cx + i * 10)} ${r(yDomeBase - 1)} Q ${r(cx + i * 12)} ${r(yDomeApex + 10)} ${r(cx + i * 6)} ${r(yDomeApex + 3)}`,
      stroke: domeCopperDark,
      strokeWidth: 0.7,
      roughness: 0.7,
    });
  }

  push({ d: rect(cx - 3, 6, 6, 9), fill: C.limeDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(cx, 5, 4, 3), fill: domeCopper, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });
  const sy = 0;
  const sr = 4.5;
  push({
    d: `M ${r(cx)} ${r(sy - sr)} L ${r(cx - sr * 0.866)} ${r(sy + sr * 0.5)} L ${r(cx + sr * 0.866)} ${r(sy + sr * 0.5)} Z`,
    fill: C.gold,
    stroke: C.goldDark,
    strokeWidth: 0.7,
    roughness: 0.7,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(cx)} ${r(sy + sr)} L ${r(cx - sr * 0.866)} ${r(sy - sr * 0.5)} L ${r(cx + sr * 0.866)} ${r(sy - sr * 0.5)} Z`,
    fill: C.goldDark,
    stroke: C.goldDark,
    strokeWidth: 0.6,
    roughness: 0.7,
    fillStyle: "solid",
  });

  push({ d: rect(cL - 3, yEntTop, cR - cL + 6, yEntBot - yEntTop), fill: C.lime, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
  for (const yy of [yEntTop + 5, yEntTop + 8]) {
    push({ d: `M ${r(cL + 2)} ${r(yy)} L ${r(cR - 2)} ${r(yy)}`, stroke: C.limeDark, strokeWidth: 0.5, roughness: 0.5 });
  }
  push({ d: rect(cL - 4, yEntBot - 2, cR - cL + 8, 3), fill: C.limeDark, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(cL - 4)} ${r(yEntTop)} L ${r(cx)} ${r(yPedApex)} L ${r(cR + 4)} ${r(yEntTop)} Z`, fill: C.lime, stroke: C.ink, strokeWidth: 1.5, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(cx)} ${r(yPedApex)} L ${r(cR + 4)} ${r(yEntTop)} L ${r(cx)} ${r(yEntTop)} Z`, fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });

  const aw = 44;
  const ah = 72;
  const ax = cx - aw / 2;
  const ay = yColTop + 4;
  push({ d: archWindow(ax, ay, aw, ah), fill: C.glass, stroke: C.ink, strokeWidth: 1.6, roughness: 0.8, fillStyle: "solid" });
  for (const yy of [ay + 22, ay + 36, ay + 50]) {
    push({ d: `M ${r(ax + 2)} ${r(yy)} L ${r(ax + aw - 2)} ${r(yy)}`, stroke: C.ink, strokeWidth: 0.55, roughness: 0.5 });
  }
  for (const ox of [cx - 12, cx, cx + 12]) {
    push({ d: `M ${r(ox)} ${r(ay + 18)} L ${r(ox)} ${r(ay + ah)}`, stroke: C.ink, strokeWidth: 0.65, roughness: 0.5 });
  }
  push({ d: ellipse(cx, ay + 12, 6, 6), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" });
  for (const ox of [cx - 10, cx + 10]) {
    push({ d: ellipse(ox, ay + 16, 3.5, 3.5), fill: C.glass, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7, fillStyle: "solid" });
  }

  ionicColumn(cx - 28, true);
  ionicColumn(cx + 28, false);

  const mpL = cx - 18;
  const mpR = cx + 18;
  push({ d: `M ${r(mpL)} ${r(yDoorTop - 2)} L ${r(cx)} ${r(yDoorTop - 14)} L ${r(mpR)} ${r(yDoorTop - 2)} Z`, fill: C.limeDark, stroke: C.ink, strokeWidth: 1.1, roughness: 0.9, fillStyle: "solid" });
  for (const hy of [yDoorTop - 6, yDoorTop - 9]) {
    push({ d: `M ${r(mpL + 4)} ${r(hy)} L ${r(mpR - 4)} ${r(hy)}`, stroke: C.ink, strokeWidth: 0.4, roughness: 0.5 });
  }

  for (const dx of spread(cL + 12, cR - 12, 3, 9)) {
    push({ d: rect(dx, yDoorTop, 9, yColBot - yDoorTop), fill: C.door, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(dx + 4.5)} ${r(yDoorTop + 6)} L ${r(dx + 4.5)} ${r(yColBot - 4)}`, stroke: C.brownTrim, strokeWidth: 0.6, roughness: 0.5 });
    push({ d: rect(dx + 1, yDoorTop + 4, 3, 5), fill: C.chimneyCap, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }

  push({
    d: `M ${r(cL - 16)} ${r(yBase)} L ${r(cL)} ${r(yStepTop)} L ${r(cR)} ${r(yStepTop)} L ${r(cR + 16)} ${r(yBase)} Z`,
    fill: C.lime,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 1,
    fillStyle: "solid",
  });
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const yy = yStepTop + (yBase - yStepTop) * t;
    push({ d: `M ${r(cL - 16 * t)} ${r(yy)} L ${r(cR + 16 * t)} ${r(yy)}`, stroke: C.limeDark, strokeWidth: 0.6, roughness: 0.6 });
  }
  push({ d: rect(0, yBase, W, yWater - yBase), fill: C.limeDark, stroke: C.ink, strokeWidth: 1.1, roughness: 1, fillStyle: "solid" });
  menorah(cL - 10, yStepTop + 2);
  menorah(cR + 10, yStepTop + 2);

  return { width: W, height: yWater + 6, anchorX: W / 2, anchorY: yWater, scale: 0.36, parts };
}

/**
 * Park Slope Jewish Center (1925, Allen A. Blaustein), Eighth Avenue at
 * Fourteenth Street: an egalitarian Conservative synagogue in pale tan brick
 * with Romanesque Revival and Baroque limestone trim. Drawn from Eighth
 * Avenue: a rounded Baroque parapet crowned by stone Tablets of the Law, a
 * great rose window, a colonnaded row of five narrow arched windows, tall
 * slit windows on the flanks, and blue double doors at the base.
 */
function parkSlopeJewishCenter(): BuildingDrawing {
  const W = 132;
  const parts: BuildingPart[] = [];

  let seed = 1340;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const tan = "#d9c89a";
  const tanDark = "#b8a574";
  const doorBlue = "#6a8fa8";

  const yWater = 244;
  const yBase = 236;
  const nL = 4;
  const nR = 128;
  const nCx = (nL + nR) / 2; // 66
  const yParSpring = 152; // spring line of the rounded parapet
  const yParApex = 78; // crown of the Baroque curve

  push({ d: ellipse(W / 2, yWater + 2, W * 0.58, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // Main tan-brick wall with a rounded Baroque parapet (not a sharp gable).
  push({
    d:
      `M ${r(nL)} ${r(yBase)} L ${r(nL)} ${r(yParSpring)} ` +
      `Q ${r(nCx)} ${r(yParApex)} ${r(nR)} ${r(yParSpring)} ` +
      `L ${r(nR)} ${r(yBase)} Z`,
    fill: tan,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1.1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  // Shaded right return for mass.
  push({ d: rect(nR - 9, yParSpring, 9, yBase - yParSpring), fill: tanDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });

  // Limestone coping following the parapet curve.
  push({
    d:
      `M ${r(nL - 1)} ${r(yParSpring - 2)} ` +
      `Q ${r(nCx)} ${r(yParApex - 4)} ${r(nR + 1)} ${r(yParSpring - 2)}`,
    stroke: C.lime,
    strokeWidth: 2.2,
    roughness: 0.8,
  });

  // Stone Tablets of the Law at the parapet crown (the building's finial).
  const tabW = 7;
  const tabH = 12;
  const tabY = yParApex - 2;
  for (const tx of [nCx - tabW - 1, nCx + 1]) {
    push({ d: rect(tx, tabY + 3, tabW, tabH - 3), fill: C.lime, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(tx)} ${r(tabY + 3)} Q ${r(tx + tabW / 2)} ${r(tabY - 1)} ${r(tx + tabW)} ${r(tabY + 3)}`, fill: C.lime, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(tx + 2)} ${r(tabY + 6)} L ${r(tx + tabW - 2)} ${r(tabY + 6)}`, stroke: C.limeDark, strokeWidth: 0.6, roughness: 0.6 });
    push({ d: `M ${r(tx + 2)} ${r(tabY + 9)} L ${r(tx + tabW - 2)} ${r(tabY + 9)}`, stroke: C.limeDark, strokeWidth: 0.6, roughness: 0.6 });
  }

  // Great rose window high in the curved parapet.
  const ry = yParApex + 28;
  push({ d: ellipse(nCx, ry, 14, 14), fill: C.glass, stroke: C.lime, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(nCx, ry, 14, 14), fill: "none", stroke: C.ink, strokeWidth: 1.2, roughness: 0.8 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    push({
      d: `M ${r(nCx + Math.cos(a) * 14)} ${r(ry + Math.sin(a) * 14)} L ${r(nCx)} ${r(ry)}`,
      stroke: C.ink,
      strokeWidth: 0.7,
      roughness: 0.6,
    });
  }
  push({ d: ellipse(nCx, ry, 4.5, 4.5), fill: C.glass, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });

  // Colonnaded row of five narrow arched windows (signature Eighth Avenue band).
  const winY = 168;
  const winH = 48;
  const winW = 10;
  const winXs = spread(nCx - 34, nCx + 24, 5, winW + 4);
  for (const wx of winXs) {
    push({ d: rect(wx - 1, winY - 2, winW + 2, winH + 2), fill: C.lime, stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });
    push({ d: archWindow(wx, winY, winW, winH), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(wx + winW / 2)} ${r(winY + 12)} L ${r(wx + winW / 2)} ${r(winY + winH)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.5 });
  }
  // Limestone colonnettes between the five windows.
  for (let i = 0; i < winXs.length - 1; i++) {
    const bx = winXs[i] + winW + 2;
    push({ d: rect(bx, winY + 6, 3, winH - 6), fill: C.lime, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });
    push({ d: rect(bx - 0.5, winY + 4, 4, 3), fill: C.limeDark, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7, fillStyle: "solid" });
  }
  // Continuous limestone sill band beneath the window row.
  push({ d: rect(nL + 6, winY + winH + 1, nR - nL - 12, 4), fill: C.lime, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });

  // Tall slit-like arched windows flanking the central composition.
  for (const [sx, lit] of [[nL + 6, true], [nR - 14, false]] as const) {
    push({ d: rect(sx - 1, winY - 18, 7, winH + 22), fill: lit ? C.lime : C.limeDark, stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });
    push({ d: archWindow(sx, winY - 16, 5, winH + 18), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  }

  // Blue double doors in a round-arched limestone portal.
  const doorW = 22;
  const doorH = 36;
  const doorX = nCx - doorW / 2;
  const doorY = yBase - doorH;
  push({ d: rect(doorX - 4, doorY - 4, doorW + 8, doorH + 4), fill: C.lime, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
  push({ d: archWindow(doorX, doorY, doorW, doorH), fill: doorBlue, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(nCx)} ${r(doorY + 6)} L ${r(nCx)} ${r(yBase)}`, stroke: C.lime, strokeWidth: 1, roughness: 0.7 });
  push({ d: rect(doorX + 2, doorY + 8, doorW / 2 - 3, doorH - 8), fill: doorBlue, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  push({ d: rect(nCx + 1, doorY + 8, doorW / 2 - 3, doorH - 8), fill: "#5a7d96", stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });

  // Short front steps.
  push({ d: rect(nCx - 18, yBase, 36, yWater - yBase), fill: C.limeDark, stroke: C.ink, strokeWidth: 1.1, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(nCx - 16)} ${r(yBase + 3)} L ${r(nCx + 16)} ${r(yBase + 3)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });

  return { width: W, height: yWater + 6, anchorX: W / 2, anchorY: yWater, scale: 0.28, parts };
}

/**
 * Brooklyn Conservatory of Music (1881, S. F. Evelette), 58 Seventh Avenue at
 * Lincoln Place: William M. Brasher's Victorian High Gothic mansion — red
 * brick with brownstone trim, a steep gabled wing on the left, a tall central
 * shaft of pointed-arched windows, and the signature corner turret on the right
 * capped by a conical slate roof.
 */
function brooklynConservatory(): BuildingDrawing {
  const W = 124;
  const DX = 10;
  const parts: BuildingPart[] = [];

  let seed = 1150;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 210;
  const yBase = 200;
  const yBasement = 188;

  // Left gabled wing (Seventh Avenue front, lower than the turret).
  const nL = 0;
  const nR = 46;
  const nCx = (nL + nR) / 2;
  const naveEave = 132;
  const naveApex = 78;

  // Central brick block.
  const cL = 40;
  const cR = 82;
  const cCorTop = 62;

  // Corner turret (right) — the signature conical cap.
  const tL = 76;
  const tR = 118;
  const tCx = (tL + tR) / 2;
  const tCapBot = 34;
  const tCapApex = 4;

  const lancetWin = (x: number, y: number, w: number, h: number) => {
    push({ d: rect(x - 2, y - 2, w + 4, h + 4), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });
    push({ d: lancet(x, y, w, h), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(x + w / 2)} ${r(y + w * 0.85)} L ${r(x + w / 2)} ${r(y + h)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7 });
  };

  // Ground shadow first.
  push({ d: ellipse(W / 2 + 3, yWater + 2, W * 0.58, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // Shaded right return (Lincoln Place side).
  push({
    d: `M ${r(tR)} ${r(cCorTop)} L ${r(tR + DX)} ${r(cCorTop + 7)} ` +
      `L ${r(tR + DX)} ${r(yWater - 3)} L ${r(tR)} ${r(yWater)} Z`,
    fill: C.brickDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });

  // --- Left gabled wing (drawn first; the turret overlaps its right edge) ---
  push({ d: `M ${r(nL - 3)} ${r(naveEave + 4)} L ${r(nCx)} ${r(naveApex - 6)} L ${r(nR + 6)} ${r(naveEave + 4)} Z`, fill: C.slate, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  push({
    d: `M ${r(nL)} ${r(yBase)} L ${r(nL)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex)} ` +
      `L ${r(nR)} ${r(naveEave)} L ${r(nR)} ${r(yBase)} Z`,
    fill: C.brick,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1.1,
    bowing: 0.5,
    fillStyle: "solid",
  });
  push({ d: `M ${r(nL - 1)} ${r(naveEave)} L ${r(nCx)} ${r(naveApex - 1)} L ${r(nR + 1)} ${r(naveEave)}`, stroke: C.bstoneTrim, strokeWidth: 1.6, roughness: 0.8 });
  lancetWin(nCx - 9, naveApex + 18, 18, 58);
  lancetWin(nL + 8, naveEave + 16, 12, 42);
  lancetWin(nR - 20, naveEave + 16, 12, 42);

  // --- Central brick block ---
  push({ d: rect(cL, cCorTop, cR - cL, yWater - cCorTop), fill: C.brick, stroke: C.ink, strokeWidth: 1.6, roughness: 1.1, bowing: 0.4, fillStyle: "solid" });
  for (const yy of [cCorTop + 28, cCorTop + 58, cCorTop + 88]) {
    push({ d: `M ${r(cL + 2)} ${r(yy)} L ${r(cR - 2)} ${r(yy)}`, stroke: C.brickDark, strokeWidth: 0.5, roughness: 1.1 });
  }
  // Brownstone cornice band.
  push({ d: rect(cL - 2, cCorTop, cR - cL + 4, 8), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  // Tall pointed windows in three tiers.
  for (const [wy, wh] of [[cCorTop + 14, 36], [cCorTop + 56, 34], [cCorTop + 96, 32]] as const) {
    for (const wx of spread(cL + 4, cR - 4, 2, 14)) {
      lancetWin(wx, wy, 14, wh);
    }
  }
  // Tall chimney rising from the roofline.
  push({ d: rect(cL + 8, 28, 10, cCorTop - 28), fill: C.brickDark, stroke: C.ink, strokeWidth: 1.1, roughness: 1, fillStyle: "solid" });
  push({ d: rect(cL + 7, 24, 12, 5), fill: C.chimneyCap, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });

  // --- Corner turret ---
  push({ d: rect(tL, tCapBot, tR - tL, yWater - tCapBot), fill: C.brick, stroke: C.ink, strokeWidth: 1.6, roughness: 1.1, bowing: 0.4, fillStyle: "solid" });
  push({ d: rect(tR - 6, tCapBot, 6, yWater - tCapBot), fill: C.brickDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  // Turret ring cornice under the cap.
  push({ d: rect(tL - 2, tCapBot, tR - tL + 4, 7), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  // Conical slate cap.
  push({ d: `M ${r(tL)} ${r(tCapBot)} L ${r(tCx)} ${r(tCapApex)} L ${r(tR)} ${r(tCapBot)} Z`, fill: C.slate, stroke: C.ink, strokeWidth: 1.3, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(tCapApex)} L ${r(tR)} ${r(tCapBot)} L ${r(tCx)} ${r(tCapBot)} Z`, fill: C.slateDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(tCx)} ${r(tCapApex)} L ${r(tCx)} ${r(tCapApex - 6)}`, stroke: C.ink, strokeWidth: 1.1, roughness: 0.7 });
  // Turret windows (stacked lancets).
  lancetWin(tCx - 8, tCapBot + 14, 16, 34);
  lancetWin(tCx - 7, tCapBot + 56, 14, 30);
  lancetWin(tCx - 6, yBase - 38, 12, 38);
  // Side entrance with stoop on the turret base.
  push({ d: lancet(tCx - 10, yBase - 34, 20, 34), fill: C.door, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(tCx - 13, yBase, 26, 3), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  push({ d: rect(tCx - 16, yWater - 1, 32, 3), fill: C.bstoneDark, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });

  // Raised brownstone basement across the foot.
  push({ d: rect(nL - 2, yBasement, tR - nL + 4 + DX, yWater - yBasement), fill: C.bstoneDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(nL - 1)} ${r(yBasement + 5)} L ${r(tR + DX - 1)} ${r(yBasement + 5)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7 });

  return { width: W + DX, height: yWater + 6, anchorX: W / 2, anchorY: yWater, scale: 0.28, parts };
}

/**
 * The Ansonia Clock Company factory (Samuel Curtiss, Jr., 1880–1881): a block-
 * square German Romanesque Revival brick complex — once billed as the largest
 * clock factory in the world. Solid Seventh Avenue front below the cornice;
 * above it, left and right roof wings recede to frame the open courtyard hole
 * in the middle of the block (like the historic postcard, but with no break
 * in the street facade).
 */
function ansoniaClockFactory(): BuildingDrawing {
  const W = 196;
  const DX = 14;
  const parts: BuildingPart[] = [];

  let seed = 1180;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  type Pt = [number, number];
  const pathFrom = (pts: Pt[], close = true): string =>
    "M " + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join(" L ") + (close ? " Z" : "");

  const yTop = -52;
  const yWater = 172;
  const yBase = 162;
  const yParTop = 14;
  const yCorBot = 24;
  const L = 2;
  const R = 194;

  // Courtyard hole above the cornice — wide center void, equal ring on three sides.
  const cL = 48;
  const cR = 148;
  const cBackL = 58;
  const cBackR = 138;
  const yCourtBack = -38;
  const wingBackL = 16;
  const wingBackR = 180;

  const romWin = (x: number, y: number, w: number, h: number) => {
    push({ d: rect(x - 1.5, y - 1.5, w + 3, h + 3), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
    push({ d: archWindow(x, y, w, h), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    push({ d: `M ${r(x + w / 2)} ${r(y + w / 2)} L ${r(x + w / 2)} ${r(y + h)}`, stroke: C.ink, strokeWidth: 0.5, roughness: 0.6 });
  };

  // Ground shadow first.
  push({ d: ellipse(W / 2 + 4, yWater + 2, W * 0.58, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // --- Courtyard void (center hole open to the sky) ---
  push({
    d: pathFrom([[cL, yParTop], [cR, yParTop], [cBackR, yCourtBack], [cBackL, yCourtBack]]),
    fill: "#e1d3b1",
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 1.2,
    fillStyle: "solid",
  });
  // Inner shadow — sells depth of the hole.
  push({
    d: pathFrom([[cL + 8, yParTop - 2], [cR - 8, yParTop - 2], [cBackR - 6, yCourtBack + 10], [cBackL + 6, yCourtBack + 10]]),
    fill: "rgba(91,74,58,0.12)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.2,
    fillStyle: "solid",
  });
  push({ d: `M ${r(cBackL + 8)} ${r(yCourtBack + 6)} L ${r(cBackR - 8)} ${r(yCourtBack + 6)}`, stroke: "rgba(91,74,58,0.28)", strokeWidth: 0.8, roughness: 0.8 });

  // Depth of the hole — inner courtyard walls.
  push({ d: pathFrom([[cL, yParTop], [cBackL, yCourtBack], [cBackL, yCourtBack + 14], [cL, yParTop - 6]]), fill: C.brick, stroke: C.ink, strokeWidth: 1.3, roughness: 1, fillStyle: "solid" });
  push({ d: pathFrom([[cR, yParTop], [cBackR, yCourtBack], [cBackR, yCourtBack + 14], [cR, yParTop - 6]]), fill: C.brickDark, stroke: C.ink, strokeWidth: 1.3, roughness: 1, fillStyle: "solid" });
  push({ d: pathFrom([[cBackL, yCourtBack], [cBackR, yCourtBack], [cBackR, yCourtBack + 14], [cBackL, yCourtBack + 14]]), fill: C.brick, stroke: C.ink, strokeWidth: 1.3, roughness: 1, fillStyle: "solid" });
  for (const wx of spread(cBackL + 4, cBackR - 4, 5, 8)) {
    push({ d: archWindow(wx, yCourtBack + 3, 8, 9), fill: C.glass, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
  }
  // Inner-wall windows facing the void.
  for (const wy of [yParTop - 10, yParTop - 22, yCourtBack + 16]) {
    for (const wx of [cL + 6, cL + 20, cR - 28, cR - 14]) {
      push({ d: archWindow(wx, wy, 8, 12), fill: C.glass, stroke: C.ink, strokeWidth: 0.8, roughness: 0.7, fillStyle: "solid" });
    }
  }

  // --- Roof wings wrapping the hole (left, right, and back arms of the ring) ---
  push({
    d: pathFrom([[L, yParTop], [cL, yParTop], [cBackL, yCourtBack + 12], [wingBackL, yTop + 6]]),
    fill: C.brickDark,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 1.1,
    fillStyle: "solid",
  });
  push({
    d: pathFrom([[cR, yParTop], [R + DX, yParTop], [wingBackR, yTop + 6], [cBackR, yCourtBack + 12]]),
    fill: C.brickDark,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 1.1,
    fillStyle: "solid",
  });
  push({
    d: pathFrom([[cBackL, yCourtBack + 12], [cBackR, yCourtBack + 12], [wingBackR, yTop + 6], [wingBackL, yTop + 6]]),
    fill: C.brick,
    stroke: C.ink,
    strokeWidth: 1.4,
    roughness: 1.1,
    fillStyle: "solid",
  });
  // Emphasize the hole lip where wings meet the courtyard.
  push({ d: `M ${r(cL)} ${r(yParTop - 6)} L ${r(cL)} ${r(yParTop - 18)}`, stroke: C.ink, strokeWidth: 1.6, roughness: 0.8 });
  push({ d: `M ${r(cR)} ${r(yParTop - 6)} L ${r(cR)} ${r(yParTop - 18)}`, stroke: C.ink, strokeWidth: 1.6, roughness: 0.8 });
  push({ d: `M ${r(cL)} ${r(yParTop)} L ${r(cR)} ${r(yParTop)}`, stroke: C.recess, strokeWidth: 1.4, roughness: 0.8 });
  push({ d: `M ${r(cBackL)} ${r(yCourtBack + 14)} L ${r(cBackR)} ${r(yCourtBack + 14)}`, stroke: C.ink, strokeWidth: 1.2, roughness: 0.8 });

  // Tall smokestack in the courtyard.
  const chX = 98;
  push({ d: rect(chX, yCourtBack + 4, 10, yTop + 10), fill: C.brickDark, stroke: C.ink, strokeWidth: 1.1, roughness: 1, fillStyle: "solid" });
  push({ d: rect(chX - 1, yTop + 2, 12, 5), fill: C.chimneyCap, stroke: C.ink, strokeWidth: 1, roughness: 0.9, fillStyle: "solid" });
  push({ d: ellipse(chX + 5, yTop - 2, 7, 5), fill: "rgba(91,74,58,0.22)", stroke: "none", strokeWidth: 0, roughness: 1.4, fillStyle: "solid" });

  // Skylights on the roof wings.
  for (const [sx, sy] of [[28, yTop + 14], [wingBackR - 24, yTop + 14], [92, yTop + 8]] as const) {
    push({ d: rect(sx, sy, 14, 5), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  }

  // --- Solid front facade (Seventh Avenue) — full width below the cornice ---
  push({
    d: `M ${r(R)} ${r(yParTop)} L ${r(R + DX)} ${r(yParTop + 7)} ` +
      `L ${r(R + DX)} ${r(yWater - 3)} L ${r(R)} ${r(yWater)} Z`,
    fill: C.brickDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });
  push({ d: rect(L, yCorBot, R - L, yWater - yCorBot), fill: C.brick, stroke: C.ink, strokeWidth: 1.6, roughness: 1.1, bowing: 0.4, fillStyle: "solid" });
  for (const yy of [yCorBot + 28, yCorBot + 56, yCorBot + 84, yCorBot + 112]) {
    push({ d: `M ${r(L + 3)} ${r(yy)} L ${r(R - 3)} ${r(yy)}`, stroke: C.brickDark, strokeWidth: 0.5, roughness: 1.1 });
  }
  push({ d: rect(L - 2, yBase - 10, (R - L) + 4 + DX, yWater - (yBase - 10)), fill: C.bstoneDark, stroke: C.ink, strokeWidth: 1.2, roughness: 1, fillStyle: "solid" });
  push({ d: `M ${r(L - 1)} ${r(yBase - 4)} L ${r(R + DX - 1)} ${r(yBase - 4)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7 });
  push({ d: rect(L - 3, yParTop, (R - L) + 6 + DX, yCorBot - yParTop), fill: C.stone, stroke: C.ink, strokeWidth: 1.4, roughness: 0.9, fillStyle: "solid" });
  push({ d: `M ${r(L - 4)} ${r(yParTop + 3)} L ${r(R + DX + 1)} ${r(yParTop + 3)}`, stroke: C.stoneDark, strokeWidth: 0.8, roughness: 0.7 });
  for (const ax of spread(L + 2, R - 2, 16, 4)) {
    push({ d: archWindow(ax, yCorBot - 4, 4, 4), fill: C.recess, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }
  for (const wy of [yCorBot + 8, yCorBot + 38, yCorBot + 68, yCorBot + 98]) {
    for (const wx of spread(L + 4, R - 4, 11, 10)) {
      romWin(wx, wy, 10, 22);
    }
  }

  // Clock face centered on the solid front.
  const clkCx = W / 2;
  const clkCy = yCorBot + 52;
  push({ d: ellipse(clkCx, clkCy, 14, 14), fill: C.stone, stroke: C.ink, strokeWidth: 1.4, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(clkCx, clkCy, 11, 11), fill: "#f4efe0", stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" });
  push({ d: `M ${r(clkCx)} ${r(clkCy)} L ${r(clkCx)} ${r(clkCy - 7)}`, stroke: C.ink, strokeWidth: 1.2, roughness: 0.6 });
  push({ d: `M ${r(clkCx)} ${r(clkCy)} L ${r(clkCx + 5)} ${r(clkCy + 1)}`, stroke: C.ink, strokeWidth: 1, roughness: 0.6 });

  return {
    width: W + DX,
    height: yWater + 6 - yTop,
    anchorX: W / 2,
    anchorY: yWater,
    scale: 0.22,
    parts,
  };
}

/**
 * William B. Cronyn House (1856–1857, Patrick Charles Keely), 271 Ninth Street
 * between Fourth and Fifth Avenues: a French Second Empire suburban villa built
 * for a Wall Street merchant when Park Slope was still country retreat. Drawn
 * from the Ninth Street photo: sky-blue walls, grey projecting ground-floor bay
 * windows flanking a columned porch, three second-floor windows under bright
 * orange lintels, a bracketed grey cornice, and a slate mansard with ornate
 * iron cresting and three pedimented dormers (the broad central one with an
 * arched window and narrow flanking lights).
 */
function cronynHouse(): BuildingDrawing {
  const W = 112;
  const DX = 9;
  const parts: BuildingPart[] = [];

  let seed = 1480;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yWater = 196;
  const yLawn = 172;
  const yBase = 168;
  const yFound = 160;
  const yBayBot = yFound;
  const yBayTop = 110;
  const yWin2Top = 72;
  const yCorBot = 70;
  const yCorTop = 58;
  const yMansardBot = yCorTop;
  const yMansardTop = 22;
  const wallH = yFound - yWin2Top;

  const sash = (x: number, y: number, w: number, h: number, lintel = false) => {
    if (lintel) {
      push({ d: rect(x - 2, y - 6, w + 4, 6), fill: C.cronynOrange, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
    }
    push({ d: rect(x, y, w, h), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.7, fillStyle: "solid" });
    push({ d: `M ${r(x + w / 2)} ${r(y)} L ${r(x + w / 2)} ${r(y + h)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
    push({ d: `M ${r(x)} ${r(y + h / 2)} L ${r(x + w)} ${r(y + h / 2)}`, stroke: C.ink, strokeWidth: 0.6, roughness: 0.6 });
  };

  /** A three-sided projecting bay with tall narrow panes. */
  const bay = (bayL: number, bayR: number, yTop: number, yBot: number, depth: number) => {
    const fL = bayL + depth;
    const fR = bayR - depth;
    const fTop = yTop - 3;
    push({
      d: `M ${r(bayL)} ${r(yTop)} L ${r(fL)} ${r(fTop)} L ${r(fL)} ${r(yBot)} L ${r(bayL)} ${r(yBot)} Z`,
      fill: C.cronynGreyDark,
      stroke: C.ink,
      strokeWidth: 1.1,
      roughness: 0.9,
      fillStyle: "solid",
    });
    push({
      d: `M ${r(bayR)} ${r(yTop)} L ${r(fR)} ${r(fTop)} L ${r(fR)} ${r(yBot)} L ${r(bayR)} ${r(yBot)} Z`,
      fill: C.cronynGreyDark,
      stroke: C.ink,
      strokeWidth: 1.1,
      roughness: 0.9,
      fillStyle: "solid",
    });
    push({ d: rect(fL, fTop, fR - fL, yBot - fTop), fill: C.cronynGrey, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
    const paneW = 5;
    const gap = (fR - fL - paneW * 3) / 4;
    for (let i = 0; i < 3; i++) {
      const px = fL + gap * (i + 1) + paneW * i;
      sash(px, fTop + 8, paneW, yBot - fTop - 14);
    }
  };

  /** Side dormer: flat pediment with bracketed cap and one arched window. */
  const sideDormer = (cx: number, halfW: number) => {
    const l = cx - halfW;
    const rgt = cx + halfW;
    push({
      d: `M ${r(l)} ${r(yMansardBot)} L ${r(l)} ${r(yMansardTop + 10)} L ${r(cx)} ${r(yMansardTop + 4)} L ${r(rgt)} ${r(yMansardTop + 10)} L ${r(rgt)} ${r(yMansardBot)} Z`,
      fill: C.slate,
      stroke: C.ink,
      strokeWidth: 1.1,
      roughness: 1,
      fillStyle: "solid",
    });
    push({ d: rect(l + 1, yMansardTop + 8, rgt - l - 2, 5), fill: C.cronynGrey, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });
    push({ d: archWindow(cx - 4, yMansardTop + 14, 8, 12), fill: C.glass, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
  };

  /** Central dormer: broad curved pediment, arched center light + narrow flanking panes. */
  const centralDormer = (cx: number, halfW: number) => {
    const l = cx - halfW;
    const rgt = cx + halfW;
    push({
      d: `M ${r(l)} ${r(yMansardBot)} L ${r(l)} ${r(yMansardTop + 12)} Q ${r(cx)} ${r(yMansardTop - 2)} ${r(rgt)} ${r(yMansardTop + 12)} L ${r(rgt)} ${r(yMansardBot)} Z`,
      fill: C.slate,
      stroke: C.ink,
      strokeWidth: 1.2,
      roughness: 1,
      fillStyle: "solid",
    });
    push({ d: rect(l + 2, yMansardTop + 8, rgt - l - 4, 6), fill: C.cronynGrey, stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });
    push({ d: archWindow(cx - 5, yMansardTop + 16, 10, 14), fill: C.glass, stroke: C.ink, strokeWidth: 0.9, roughness: 0.7, fillStyle: "solid" });
    sash(cx - 14, yMansardTop + 18, 4, 12);
    sash(cx + 10, yMansardTop + 18, 4, 12);
  };

  push({ d: ellipse(W / 2 + 2, yWater + 2, W * 0.58, 9), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // Front lawn (below the orange foundation band).
  push({ d: rect(2, yLawn, W - 4, yWater - yLawn - 2), fill: "rgba(143,185,95,0.32)", stroke: C.ink, strokeWidth: 0.7, roughness: 1.1, fillStyle: "solid" });

  // Shaded right return.
  push({
    d: `M ${r(W)} ${r(yWin2Top)} L ${r(W + DX)} ${r(yWin2Top + 8)} L ${r(W + DX)} ${r(yWater - 3)} L ${r(W)} ${r(yWater)} Z`,
    fill: C.cronynBlueDark,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1.1,
    fillStyle: "solid",
  });

  // Sky-blue main wall.
  push({ d: rect(0, yWin2Top, W, wallH), fill: C.cronynBlue, stroke: C.ink, strokeWidth: 1.6, roughness: 1, bowing: 0.4, fillStyle: "solid" });
  push({ d: rect(W - 7, yWin2Top, 7, wallH), fill: C.cronynBlueDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });

  // Orange foundation band at the foot of the wall.
  push({ d: rect(-2, yFound, W + 4 + DX, yBase - yFound), fill: C.cronynOrange, stroke: C.ink, strokeWidth: 1.1, roughness: 1, fillStyle: "solid" });

  // Ground-floor projecting bays.
  bay(6, 30, yBayTop, yBayBot, 8);
  bay(82, 106, yBayTop, yBayBot, 8);

  // Central porch: small roof, columns, recessed grey door.
  const pL = 38;
  const pR = 74;
  const pRoof = yBayTop - 6;
  push({ d: rect(pL, pRoof, pR - pL, 5), fill: C.cronynGrey, stroke: C.ink, strokeWidth: 1.1, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(pL + 4, yBayTop, 5, yBayBot - yBayTop), fill: C.cronynGrey, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(pR - 9, yBayTop, 5, yBayBot - yBayTop), fill: C.cronynGrey, stroke: C.ink, strokeWidth: 1, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(pL + 10, yBayTop + 6, pR - pL - 20, yBayBot - yBayTop - 8), fill: C.cronynGreyDark, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  push({ d: rect(pL + 18, yBayTop + 12, 16, yBayBot - yBayTop - 16), fill: C.glass, stroke: C.ink, strokeWidth: 1.1, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(pL + 26)} ${r(yBayTop + 12)} L ${r(pL + 26)} ${r(yBayBot - 4)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });
  push({ d: `M ${r(pL + 18)} ${r(yBayTop + 24)} L ${r(pL + 34)} ${r(yBayTop + 24)}`, stroke: C.ink, strokeWidth: 0.7, roughness: 0.6 });

  // Second floor: three windows with orange lintels.
  for (const wx of spread(10, W - 10, 3, 16)) {
    sash(wx, yWin2Top + 8, 16, 28, true);
  }

  // Heavy grey bracketed cornice.
  push({ d: rect(-2, yCorTop, W + 4, yCorBot - yCorTop), fill: C.cronynGrey, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });
  for (const x of spread(0, W, 9, 4)) {
    push({ d: rect(x, yCorBot - 1, 4, 5), fill: C.cronynGreyDark, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  }

  // Slate mansard roof.
  push({
    d: `M ${r(-2)} ${r(yMansardBot)} L ${r(W / 2)} ${r(yMansardTop)} L ${r(W + 2)} ${r(yMansardBot)} Z`,
    fill: C.slate,
    stroke: C.ink,
    strokeWidth: 1.3,
    roughness: 1,
    fillStyle: "solid",
  });
  push({
    d: `M ${r(W / 2)} ${r(yMansardTop)} L ${r(W + 2)} ${r(yMansardBot)} L ${r(W / 2)} ${r(yMansardBot)} Z`,
    fill: C.slateDark,
    stroke: "none",
    strokeWidth: 0,
    roughness: 1,
    fillStyle: "solid",
  });

  // Mansard dormers (central broad, side pediments).
  sideDormer(24, 10);
  centralDormer(W / 2, 16);
  sideDormer(88, 10);

  // Painted flower motifs on the mansard (between dormers).
  for (const fx of [42, 70]) {
    push({ d: ellipse(fx, yMansardTop + 16, 3.5, 3.5), fill: C.gGold, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  }

  // Ornamental iron cresting along the mansard ridge.
  for (let x = 6; x <= W - 6; x += 5) {
    push({ d: `M ${r(x)} ${r(yMansardTop + 4)} L ${r(x + 2.5)} ${r(yMansardTop)} L ${r(x + 5)} ${r(yMansardTop + 4)}`, stroke: C.rail, strokeWidth: 0.9, roughness: 0.6 });
  }

  // Wrought-iron fence across the yard (in front of the lawn).
  for (const x of spread(6, W - 6, 11, 1)) {
    push({ d: `M ${r(x)} ${r(yLawn + 2)} L ${r(x)} ${r(yWater - 4)}`, stroke: C.rail, strokeWidth: 1, roughness: 0.7 });
  }
  push({ d: `M ${r(6)} ${r(yLawn + 2)} L ${r(W - 6)} ${r(yLawn + 2)}`, stroke: C.rail, strokeWidth: 1.4, roughness: 0.7 });
  push({ d: `M ${r(6)} ${r(yWater - 4)} L ${r(W - 6)} ${r(yWater - 4)}`, stroke: C.rail, strokeWidth: 1.2, roughness: 0.7 });

  return { width: W + DX, height: yWater + 4, anchorX: W / 2, anchorY: yWater, scale: 0.34, parts };
}

/**
 * 410 Third Street ("Everything and a Bathtub"), a 1920 four-story walk-up
 * between Fifth and Sixth Avenues whose front yard is a year-round collage of
 * figurines, signs, seasonal props, and — famously — a clawfoot bathtub. A
 * must-see on the neighborhood's Spooky Stoops circuit and StoopDecor lists.
 * Drawn as the plain limestone walk-up behind a cluttered areaway: stoop, tub,
 * and a jumble of lawn ornaments spilling toward the sidewalk.
 */
function eccentricHouse(): BuildingDrawing {
  const W = 70;
  const parts: BuildingPart[] = [];

  let seed = 1420;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const yCorTop = 6;
  const yCorBot = 14;
  const yF4 = 18;
  const yF3 = 44;
  const yF2 = 70;
  const yF1 = 96;
  const hWin = 18;
  const yEntTop = 118;
  const yEntBot = 138;
  const yStoopBot = 148;
  const yYard = 152;
  const yWater = 182;

  const win = (x: number, y: number, w: number, h: number) => {
    push({ d: rect(x, y, w, h), fill: C.glass, stroke: C.ink, strokeWidth: 1, roughness: 0.6, fillStyle: "solid" });
    push({ d: `M ${r(x + w / 2)} ${r(y)} L ${r(x + w / 2)} ${r(y + h)}`, stroke: C.ink, strokeWidth: 0.5, roughness: 0.5 });
    push({ d: `M ${r(x)} ${r(y + h / 2)} L ${r(x + w)} ${r(y + h / 2)}`, stroke: C.ink, strokeWidth: 0.5, roughness: 0.5 });
  };

  push({ d: ellipse(W / 2, yWater + 2, W * 0.62, 8), fill: "rgba(91,74,58,0.16)", stroke: "none", strokeWidth: 0, roughness: 1.6, fillStyle: "solid" });

  // Plain tan-limestone walk-up (1920, four stories).
  push({ d: rect(0, yCorBot, W, yStoopBot - yCorBot), fill: C.lime, stroke: C.ink, strokeWidth: 1.6, roughness: 1.1, bowing: 0.4, fillStyle: "solid" });
  push({ d: rect(W - 8, yCorBot, 8, yStoopBot - yCorBot), fill: C.limeDark, stroke: "none", strokeWidth: 0, roughness: 1, fillStyle: "solid" });
  push({ d: rect(-2, yCorTop, W + 4, yCorBot - yCorTop), fill: C.bstoneTrim, stroke: C.ink, strokeWidth: 1.2, roughness: 0.9, fillStyle: "solid" });

  for (const wy of [yF4, yF3, yF2, yF1]) {
    win(12, wy, 14, hWin);
    win(44, wy, 14, hWin);
  }

  // Entrance + short stoop.
  push({ d: rect(28, yEntTop, 14, yEntBot - yEntTop), fill: C.door, stroke: C.ink, strokeWidth: 1.3, roughness: 0.9, fillStyle: "solid" });
  push({
    d: `M ${r(22)} ${r(yStoopBot)} L ${r(26)} ${r(yEntBot)} L ${r(44)} ${r(yEntBot)} L ${r(48)} ${r(yStoopBot)} Z`,
    fill: C.bstoneTrim,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 1,
    fillStyle: "solid",
  });
  push({ d: rect(20, yEntBot - 2, 4, 14), fill: C.rail, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(46, yEntBot - 2, 4, 14), fill: C.rail, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });

  // Cluttered front yard — the eccentric signature.
  push({ d: rect(2, yYard, W - 4, yWater - yYard - 2), fill: "rgba(143,185,95,0.35)", stroke: C.ink, strokeWidth: 0.8, roughness: 1.2, fillStyle: "solid" });

  // The clawfoot bathtub.
  push({ d: rect(8, yYard + 8, 22, 10), fill: "#e8e4dc", stroke: C.ink, strokeWidth: 1.1, roughness: 0.9, fillStyle: "solid" });
  push({ d: ellipse(8, yYard + 18, 4, 3), fill: "#e8e4dc", stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(30, yYard + 18, 4, 3), fill: "#e8e4dc", stroke: C.ink, strokeWidth: 0.9, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(10, yYard + 6, 18, 3), fill: "#d5d0c8", stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" });

  // Assorted lawn ornaments and props.
  push({ d: ellipse(42, yYard + 14, 5, 7), fill: C.gPink, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" }); // figurine
  push({ d: rect(50, yYard + 10, 8, 12), fill: C.gGold, stroke: C.ink, strokeWidth: 0.9, roughness: 0.9, fillStyle: "solid" }); // sign/post
  push({ d: ellipse(58, yYard + 8, 4, 4), fill: C.petal, stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" }); // pumpkin/ball
  push({ d: rect(36, yYard + 4, 3, 10), fill: C.rail, stroke: C.ink, strokeWidth: 0.7, roughness: 0.7, fillStyle: "solid" });
  push({ d: ellipse(37, yYard + 2, 5, 4), fill: "#f4efe0", stroke: C.ink, strokeWidth: 0.8, roughness: 0.8, fillStyle: "solid" }); // skull/head
  push({ d: rect(14, yYard + 22, 10, 4), fill: C.gCoral, stroke: C.ink, strokeWidth: 0.8, roughness: 0.9, fillStyle: "solid" }); // prop crate
  push({ d: ellipse(62, yYard + 20, 3, 5), fill: C.gLilac, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });

  const pinwheel = (px: number, py: number, color: string) => {
    push({ d: rect(px, py + 4, 1.5, 9), fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
    push({ d: ellipse(px, py + 2, 5, 5), fill: color, stroke: C.ink, strokeWidth: 0.7, roughness: 0.85, fillStyle: "solid" });
    push({ d: `M ${r(px - 2)} ${r(py + 2)} L ${r(px + 2)} ${r(py + 2)} M ${r(px)} ${r(py)} L ${r(px)} ${r(py + 4)}`, stroke: C.ink, strokeWidth: 0.5, roughness: 0.6 });
  };
  pinwheel(3, yYard + 4, C.gPink);
  pinwheel(54, yYard + 16, C.gGold);
  pinwheel(26, yYard + 2, C.gLilac);

  const plasticBloom = (bx: number, by: number, color: string) => {
    push({ d: rect(bx + 1, by + 4, 1.2, 6), fill: C.gPinkDark, stroke: C.ink, strokeWidth: 0.5, roughness: 0.6, fillStyle: "solid" });
    push({ d: ellipse(bx, by, 3.5, 3.5), fill: color, stroke: C.ink, strokeWidth: 0.6, roughness: 0.75, fillStyle: "solid" });
    push({ d: ellipse(bx + 2.5, by + 1, 2.5, 2.5), fill: color, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
    push({ d: ellipse(bx - 1.5, by + 2, 2.5, 2.5), fill: color, stroke: "none", strokeWidth: 0, roughness: 0.7, fillStyle: "solid" });
  };
  plasticBloom(32, yYard + 18, C.gPink);
  plasticBloom(46, yYard + 22, C.gLilac);
  plasticBloom(58, yYard + 12, C.gCoral);
  plasticBloom(22, yYard + 2, C.gGold);
  plasticBloom(6, yYard + 20, C.gPink);
  plasticBloom(64, yYard + 6, C.gGold);

  // Rubber duck, gnome, flamingo.
  push({ d: ellipse(18, yYard + 10, 4, 3), fill: C.gGold, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(21, yYard + 9, 2, 1.5), fill: C.gGoldDark, stroke: C.ink, strokeWidth: 0.5, roughness: 0.7, fillStyle: "solid" });
  push({ d: rect(28, yYard + 20, 4, 6), fill: C.gCoral, stroke: C.ink, strokeWidth: 0.7, roughness: 0.85, fillStyle: "solid" });
  push({ d: `M ${r(26)} ${r(yYard + 20)} L ${r(30)} ${r(yYard + 20)} L ${r(28)} ${r(yYard + 15)} Z`, fill: C.gCoralDark, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(30, yYard + 18, 3, 3), fill: "#f4efe0", stroke: C.ink, strokeWidth: 0.6, roughness: 0.75, fillStyle: "solid" });
  push({ d: rect(6, yYard + 12, 1.5, 12), fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.65, fillStyle: "solid" });
  push({ d: `M ${r(7)} ${r(yYard + 10)} L ${r(12)} ${r(yYard + 8)} L ${r(7)} ${r(yYard + 14)} Z`, fill: C.gPink, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(11, yYard + 8, 5, 1.2), fill: C.gPinkDark, stroke: C.ink, strokeWidth: 0.5, roughness: 0.7, fillStyle: "solid" });

  // Flags, signs, planters.
  push({ d: rect(64, yYard + 2, 1.2, 14), fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.65, fillStyle: "solid" });
  push({ d: `M ${r(65)} ${r(yYard + 2)} L ${r(70)} ${r(yYard + 5)} L ${r(65)} ${r(yYard + 8)} Z`, fill: C.gCoral, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(38, yYard + 6, 6, 5), fill: "#b56e41", stroke: C.ink, strokeWidth: 0.7, roughness: 0.85, fillStyle: "solid" });
  push({ d: ellipse(41, yYard + 4, 5, 4), fill: C.gLilac, stroke: C.ink, strokeWidth: 0.6, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(48, yYard + 24, 5, 4), fill: "#b56e41", stroke: C.ink, strokeWidth: 0.7, roughness: 0.85, fillStyle: "solid" });
  push({ d: ellipse(50.5, yYard + 22, 4, 3), fill: C.gPink, stroke: C.ink, strokeWidth: 0.6, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(18, yYard + 14, 1.2, 10), fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.65, fillStyle: "solid" });
  push({ d: rect(14, yYard + 12, 9, 5), fill: "#f4efe0", stroke: C.ink, strokeWidth: 0.7, roughness: 0.85, fillStyle: "solid" });
  push({ d: `M ${r(15)} ${r(yYard + 14.5)} L ${r(22)} ${r(yYard + 14.5)} M ${r(15)} ${r(yYard + 16)} L ${r(20)} ${r(yYard + 16)}`, stroke: C.ink, strokeWidth: 0.45, roughness: 0.55 });
  push({ d: rect(56, yYard + 2, 1.2, 8), fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.65, fillStyle: "solid" });
  push({ d: rect(52, yYard + 1, 7, 4), fill: C.gGold, stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });

  // Beach ball, crates, cutout, lawn chair.
  push({ d: ellipse(52, yYard + 4, 4, 4), fill: C.gGold, stroke: C.ink, strokeWidth: 0.7, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(49)} ${r(yYard + 4)} L ${r(55)} ${r(yYard + 4)} M ${r(52)} ${r(yYard + 1)} L ${r(52)} ${r(yYard + 7)}`, stroke: C.gCoral, strokeWidth: 0.45, roughness: 0.55 });
  push({ d: rect(34, yYard + 24, 8, 4), fill: C.gCoralDark, stroke: C.ink, strokeWidth: 0.7, roughness: 0.85, fillStyle: "solid" });
  push({ d: rect(35, yYard + 22, 6, 3), fill: "#7e9498", stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });
  push({ d: rect(44, yYard + 1, 1.2, 8), fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.65, fillStyle: "solid" });
  push({ d: `M ${r(42)} ${r(yYard + 1)} L ${r(47)} ${r(yYard + 1)} L ${r(46)} ${r(yYard + 7)} L ${r(43)} ${r(yYard + 7)} Z`, fill: C.brownTrim, stroke: C.ink, strokeWidth: 0.7, roughness: 0.85, fillStyle: "solid" });
  push({ d: rect(10, yYard + 26, 7, 1.5), fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.7, fillStyle: "solid" });
  push({ d: rect(10, yYard + 22, 1, 5), fill: C.rail, stroke: C.ink, strokeWidth: 0.55, roughness: 0.65, fillStyle: "solid" });
  push({ d: rect(16, yYard + 22, 1, 5), fill: C.rail, stroke: C.ink, strokeWidth: 0.55, roughness: 0.65, fillStyle: "solid" });
  push({ d: `M ${r(10)} ${r(yYard + 22)} L ${r(12)} ${r(yYard + 18)} L ${r(15)} ${r(yYard + 18)} L ${r(17)} ${r(yYard + 22)} Z`, fill: C.gLilac, stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });

  // Wind spinner, sidewalk spill.
  push({ d: rect(60, yYard + 1, 1.2, 11), fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.65, fillStyle: "solid" });
  push({ d: ellipse(61, yYard, 6, 2.5), fill: C.gLilac, stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(61, yYard, 2.5, 6), fill: C.gPink, stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(1, yYard + 24, 3, 2.5), fill: C.petal, stroke: C.ink, strokeWidth: 0.6, roughness: 0.75, fillStyle: "solid" });
  push({ d: rect(66, yYard + 24, 3, 2), fill: C.gGoldDark, stroke: C.ink, strokeWidth: 0.6, roughness: 0.75, fillStyle: "solid" });
  push({ d: ellipse(40, yYard + 26, 2.5, 2), fill: C.gPinkDark, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });

  // Second wave — even more seasonal / junk pile.
  // Jack-o-lantern + witch hat.
  push({ d: ellipse(33, yYard + 10, 4.5, 4), fill: C.petal, stroke: C.ink, strokeWidth: 0.7, roughness: 0.85, fillStyle: "solid" });
  push({ d: `M ${r(31)} ${r(yYard + 11)} L ${r(35)} ${r(yYard + 11)} M ${r(32.5)} ${r(yYard + 12.5)} L ${r(33.5)} ${r(yYard + 12.5)}`, stroke: C.ink, strokeWidth: 0.45, roughness: 0.55 });
  push({ d: `M ${r(31)} ${r(yYard + 8)} L ${r(35)} ${r(yYard + 8)} L ${r(33)} ${r(yYard + 4)} Z`, fill: C.rail, stroke: C.ink, strokeWidth: 0.6, roughness: 0.75, fillStyle: "solid" });

  // Teddy bear / stuffed animal.
  push({ d: ellipse(24, yYard + 24, 4, 3.5), fill: C.brownTrim, stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(22, yYard + 22, 2, 2), fill: C.brownTrim, stroke: C.ink, strokeWidth: 0.55, roughness: 0.75, fillStyle: "solid" });
  push({ d: ellipse(26, yYard + 22, 2, 2), fill: C.brownTrim, stroke: C.ink, strokeWidth: 0.55, roughness: 0.75, fillStyle: "solid" });

  // Toy wagon.
  push({ d: rect(42, yYard + 18, 10, 4), fill: C.gCoral, stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(44, yYard + 23, 2.5, 2.5), fill: C.rail, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });
  push({ d: ellipse(50, yYard + 23, 2.5, 2.5), fill: C.rail, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });
  push({ d: rect(51, yYard + 16, 1, 4), fill: C.rail, stroke: C.ink, strokeWidth: 0.5, roughness: 0.65, fillStyle: "solid" });

  // Bird bath bowl on a pedestal.
  push({ d: rect(2, yYard + 14, 1.5, 8), fill: C.rail, stroke: C.ink, strokeWidth: 0.55, roughness: 0.65, fillStyle: "solid" });
  push({ d: ellipse(3, yYard + 12, 5, 3), fill: "#e8e4dc", stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });

  // Tiki torch.
  push({ d: rect(67, yYard + 10, 1.2, 12), fill: C.brownDark, stroke: C.ink, strokeWidth: 0.55, roughness: 0.65, fillStyle: "solid" });
  push({ d: ellipse(67.5, yYard + 8, 3, 4), fill: C.gCoral, stroke: C.ink, strokeWidth: 0.6, roughness: 0.8, fillStyle: "solid" });

  // Mushroom cluster (fairy-garden vibe).
  push({ d: rect(55, yYard + 20, 1, 4), fill: "#f4efe0", stroke: C.ink, strokeWidth: 0.5, roughness: 0.65, fillStyle: "solid" });
  push({ d: ellipse(55.5, yYard + 19, 4, 2.5), fill: C.gCoral, stroke: C.ink, strokeWidth: 0.6, roughness: 0.75, fillStyle: "solid" });
  push({ d: rect(59, yYard + 22, 0.8, 3), fill: "#f4efe0", stroke: C.ink, strokeWidth: 0.45, roughness: 0.6, fillStyle: "solid" });
  push({ d: ellipse(59.5, yYard + 21, 3, 2), fill: C.gLilac, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });

  // Leaning umbrella.
  push({ d: rect(12, yYard + 6, 1, 14), fill: C.rail, stroke: C.ink, strokeWidth: 0.5, roughness: 0.6, fillStyle: "solid" });
  push({ d: `M ${r(8)} ${r(yYard + 6)} Q ${r(14)} ${r(yYard + 2)} ${r(20)} ${r(yYard + 6)} L ${r(12)} ${r(yYard + 8)} Z`, fill: C.gPink, stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });

  // Angel / statue figurine.
  push({ d: rect(36, yYard + 14, 3, 8), fill: "#e8e4dc", stroke: C.ink, strokeWidth: 0.6, roughness: 0.8, fillStyle: "solid" });
  push({ d: ellipse(37.5, yYard + 12, 3, 3), fill: "#e8e4dc", stroke: C.ink, strokeWidth: 0.55, roughness: 0.75, fillStyle: "solid" });
  push({ d: `M ${r(34)} ${r(yYard + 16)} L ${r(32)} ${r(yYard + 12)} M ${r(41)} ${r(yYard + 16)} L ${r(43)} ${r(yYard + 12)}`, stroke: C.ink, strokeWidth: 0.45, roughness: 0.55 });

  // Coiled garden hose.
  push({ d: ellipse(30, yYard + 26, 5, 2.5), fill: C.glass, stroke: C.ink, strokeWidth: 0.6, roughness: 0.75, fillStyle: "solid" });
  push({ d: ellipse(30, yYard + 26, 2.5, 1.5), fill: "rgba(143,185,95,0.35)", stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });

  // String of lights draped across the yard.
  push({ d: `M ${r(4)} ${r(yYard + 3)} Q ${r(20)} ${r(yYard + 7)} ${r(35)} ${r(yYard + 3)} Q ${r(50)} ${r(yYard - 1)} ${r(66)} ${r(yYard + 4)}`, stroke: C.rail, strokeWidth: 0.5, roughness: 0.55 });
  for (const lx of [8, 18, 28, 38, 48, 58]) {
    push({ d: ellipse(lx, yYard + (lx < 35 ? 4 : 3), 1.8, 1.8), fill: lx % 3 === 0 ? C.gGold : lx % 3 === 1 ? C.gPink : C.gCoral, stroke: "none", strokeWidth: 0, roughness: 0.6, fillStyle: "solid" });
  }

  // More figurines and junk on the sidewalk edge.
  push({ d: ellipse(16, yYard + 27, 2, 2.5), fill: C.gLilac, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });
  push({ d: rect(22, yYard + 27, 4, 2), fill: C.gGoldDark, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });
  push({ d: ellipse(48, yYard + 27, 2.5, 2), fill: C.petalDark, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });
  push({ d: rect(54, yYard + 26, 3, 3), fill: "#7e9498", stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });
  push({ d: ellipse(62, yYard + 26, 2, 2), fill: C.gPink, stroke: C.ink, strokeWidth: 0.5, roughness: 0.65, fillStyle: "solid" });

  // Small ladder leaning against nothing.
  push({ d: rect(4, yYard + 8, 1.5, 14), fill: C.brownTrim, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });
  push({ d: rect(8, yYard + 10, 1.5, 12), fill: C.brownTrim, stroke: C.ink, strokeWidth: 0.55, roughness: 0.7, fillStyle: "solid" });
  for (let ly = yYard + 11; ly < yYard + 20; ly += 3) {
    push({ d: `M ${r(4)} ${r(ly)} L ${r(9)} ${r(ly + 1)}`, stroke: C.brownDark, strokeWidth: 0.5, roughness: 0.55 });
  }

  // Toy dinosaur (simple blob + tail).
  push({ d: ellipse(46, yYard + 8, 5, 3.5), fill: C.gPinkDark, stroke: C.ink, strokeWidth: 0.65, roughness: 0.8, fillStyle: "solid" });
  push({ d: `M ${r(41)} ${r(yYard + 8)} L ${r(38)} ${r(yYard + 6)} L ${r(41)} ${r(yYard + 10)} Z`, fill: C.gPinkDark, stroke: C.ink, strokeWidth: 0.55, roughness: 0.75, fillStyle: "solid" });

  // Snowman head (seasonal mix — sits among the Halloween stuff).
  push({ d: ellipse(20, yYard + 6, 3.5, 3.5), fill: "#f4efe0", stroke: C.ink, strokeWidth: 0.6, roughness: 0.75, fillStyle: "solid" });
  push({ d: ellipse(19, yYard + 5, 0.8, 0.8), fill: C.rail, stroke: "none", strokeWidth: 0, roughness: 0.5, fillStyle: "solid" });
  push({ d: ellipse(21, yYard + 5, 0.8, 0.8), fill: C.rail, stroke: "none", strokeWidth: 0, roughness: 0.5, fillStyle: "solid" });
  push({ d: rect(19.5, yYard + 6.5, 2, 0.6), fill: C.gCoral, stroke: "none", strokeWidth: 0, roughness: 0.5, fillStyle: "solid" });

  // Wind chime hanging from a stake.
  push({ d: rect(40, yYard + 1, 1, 6), fill: C.rail, stroke: C.ink, strokeWidth: 0.5, roughness: 0.6, fillStyle: "solid" });
  push({ d: `M ${r(36)} ${r(yYard + 7)} L ${r(44)} ${r(yYard + 7)}`, stroke: C.rail, strokeWidth: 0.45, roughness: 0.55 });
  for (const cx of [37, 39.5, 42, 44.5]) {
    push({ d: rect(cx, yYard + 7, 0.8, 5), fill: C.gGold, stroke: C.ink, strokeWidth: 0.4, roughness: 0.6, fillStyle: "solid" });
  }

  return {
    width: W,
    height: yWater + 4,
    anchorX: W / 2,
    anchorY: yWater,
    scale: 0.38,
    parts,
  };
}

/**
 * Barclays Center (2012, SHoP Architects / AECOM): Brooklyn's arena at Atlantic
 * Yards. Drawn as the Flatbush Avenue elevation — a low, wide horseshoe of
 * weathering steel: two side piers joined by a deep cantilevered roof ring,
 * open plaza recess beneath, elliptical oculus, blue LED sign, and a glass
 * entrance band at street level.
 */
function barclaysCenter(): BuildingDrawing {
  const W = 220;
  const parts: BuildingPart[] = [];

  let seed = 1480;
  const next = () => seed++;
  const push = (p: Omit<BuildingPart, "seed">) => parts.push({ seed: next(), ...p });

  const cx = W / 2;
  const yWater = 138;
  const yBase = 130;
  const yGlassTop = 116;

  // Horseshoe anchors — low and wide; the overhang is the widest element.
  const xOutL = 28;
  const xOutR = 192;
  const xCantL = 4;
  const xCantR = 216;
  const xInL = 70;
  const xInR = 150;
  const yCantTop = 14;
  const yCantOuter = 36;
  const yCantInner = 38;

  push({
    d: ellipse(cx, yWater + 2, W * 0.48, 9),
    fill: "rgba(91,74,58,0.16)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 1.6,
    fillStyle: "solid",
  });

  // Plaza void beneath the overhang — the open recess you walk into.
  push({
    d:
      `M ${r(xInL + 2)} ${r(yCantInner + 2)} ` +
      `L ${r(xInR - 2)} ${r(yCantInner + 2)} ` +
      `L ${r(xInR - 4)} ${r(yGlassTop)} ` +
      `L ${r(xInL + 4)} ${r(yGlassTop)} Z`,
    fill: C.recess,
    stroke: "none",
    strokeWidth: 0,
    roughness: 0.75,
    fillStyle: "solid",
  });

  // Single corten horseshoe — side legs + sweeping overhang, one continuous band.
  push({
    d:
      `M ${r(xOutL)} ${r(yBase)} ` +
      `C ${r(xOutL - 10)} ${r(yGlassTop + 4)} ${r(xCantL + 2)} ${r(yCantOuter + 18)} ${r(xCantL)} ${r(yCantOuter)} ` +
      `L ${r(xCantL)} ${r(yCantTop)} ` +
      `Q ${r(cx)} ${r(yCantTop - 8)} ${r(xCantR)} ${r(yCantTop)} ` +
      `L ${r(xCantR)} ${r(yCantOuter)} ` +
      `C ${r(xCantR - 2)} ${r(yCantOuter + 18)} ${r(xOutR + 10)} ${r(yGlassTop + 4)} ${r(xOutR)} ${r(yBase)} ` +
      `L ${r(xInR)} ${r(yBase)} ` +
      `L ${r(xInR + 2)} ${r(yGlassTop)} ` +
      `L ${r(xInR - 2)} ${r(yCantInner + 8)} ` +
      `L ${r(xInR - 10)} ${r(yCantInner)} ` +
      `L ${r(xInL + 10)} ${r(yCantInner)} ` +
      `L ${r(xInL + 2)} ${r(yCantInner + 8)} ` +
      `L ${r(xInL - 2)} ${r(yGlassTop)} ` +
      `L ${r(xInL)} ${r(yBase)} Z`,
    fill: C.corten,
    stroke: C.ink,
    strokeWidth: 1.6,
    roughness: 1,
    bowing: 0.3,
    fillStyle: "solid",
  });

  // Shaded right pier return.
  push({
    d:
      `M ${r(xOutR - 6)} ${r(yGlassTop + 10)} L ${r(xOutR)} ${r(yBase)} L ${r(xInR)} ${r(yBase)} ` +
      `L ${r(xInR + 2)} ${r(yGlassTop)} L ${r(xInR - 6)} ${r(yCantInner + 12)} L ${r(xOutR - 14)} ${r(yCantInner + 18)} Z`,
    fill: C.cortenDark,
    stroke: "none",
    strokeWidth: 0,
    roughness: 1,
    fillStyle: "solid",
  });

  // Underside shadow of the overhang lip.
  push({
    d:
      `M ${r(xCantL + 10)} ${r(yCantOuter)} L ${r(xCantR - 10)} ${r(yCantOuter)} ` +
      `L ${r(xInR - 10)} ${r(yCantInner)} L ${r(xInL + 10)} ${r(yCantInner)} Z`,
    fill: "rgba(63,51,39,0.45)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 0.8,
    fillStyle: "solid",
  });

  // Horizontal lattice bands on the left pier.
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const yy = yGlassTop + 6 + t * (yCantInner + 4 - yGlassTop);
    const xOut = xOutL - 4 - t * 6;
    const xIn = xInL + 4 + t * 4;
    push({
      d: `M ${r(xOut)} ${r(yy)} L ${r(xIn)} ${r(yy - 1)}`,
      stroke: C.cortenDark,
      strokeWidth: 0.65,
      roughness: 0.65,
    });
  }

  // Horizontal lattice bands on the right pier.
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const yy = yGlassTop + 6 + t * (yCantInner + 4 - yGlassTop);
    const xOut = xOutR + 4 + t * 6;
    const xIn = xInR - 4 - t * 4;
    push({
      d: `M ${r(xIn)} ${r(yy - 1)} L ${r(xOut)} ${r(yy)}`,
      stroke: C.cortenDark,
      strokeWidth: 0.65,
      roughness: 0.65,
    });
  }

  // Bands across the overhang crown.
  for (let i = 0; i < 3; i++) {
    const yy = yCantTop + 4 + i * 7;
    const inset = 18 + i * 12;
    push({
      d: `M ${r(xCantL + inset)} ${r(yy)} Q ${r(cx)} ${r(yy - 1)} ${r(xCantR - inset)} ${r(yy)}`,
      stroke: C.cortenDark,
      strokeWidth: 0.6,
      roughness: 0.6,
    });
  }

  // Oculus — bright horizontal opening in the overhang.
  push({
    d: ellipse(cx - 6, yCantTop + 10, 24, 8),
    fill: "#e8eef0",
    stroke: C.cortenDark,
    strokeWidth: 1.1,
    roughness: 0.75,
    fillStyle: "solid",
  });
  push({
    d: ellipse(cx - 6, yCantTop + 10, 15, 5),
    fill: "rgba(184,212,224,0.55)",
    stroke: "none",
    strokeWidth: 0,
    roughness: 0.6,
    fillStyle: "solid",
  });

  // Blue "Barclays Center" sign on the overhang face (upper right).
  const signL = 118;
  const signW = 78;
  const signY = yCantTop + 18;
  push({
    d: rect(signL, signY, signW, 7),
    fill: "#2a8fc4",
    stroke: C.ink,
    strokeWidth: 0.8,
    roughness: 0.65,
    fillStyle: "solid",
  });
  for (const tx of spread(signL + 4, signL + signW - 4, 8, 5)) {
    push({
      d: rect(tx, signY + 1, 4.5, 5),
      fill: "#c8e4f4",
      stroke: "none",
      strokeWidth: 0,
      roughness: 0.5,
      fillStyle: "solid",
    });
  }

  // Glass entrance band between the two piers.
  push({
    d:
      `M ${r(xInL)} ${r(yBase)} L ${r(xInL - 2)} ${r(yGlassTop)} ` +
      `L ${r(xInR + 2)} ${r(yGlassTop)} L ${r(xInR)} ${r(yBase)} Z`,
    fill: C.glass,
    stroke: C.ink,
    strokeWidth: 1.2,
    roughness: 0.9,
    fillStyle: "solid",
  });
  for (const gx of spread(xInL + 8, xInR - 8, 5, 9)) {
    push({
      d: rect(gx, yGlassTop + 3, 9, yBase - yGlassTop - 5),
      fill: C.recess,
      stroke: C.ink,
      strokeWidth: 0.8,
      roughness: 0.7,
      fillStyle: "solid",
    });
    push({
      d: `M ${r(gx + 4.5)} ${r(yGlassTop + 3)} L ${r(gx + 4.5)} ${r(yBase - 2)}`,
      stroke: C.glass,
      strokeWidth: 0.5,
      roughness: 0.5,
    });
  }

  // Planted berm in the entry plaza.
  push({
    d: ellipse(cx, yBase - 2, 26, 6),
    fill: "rgba(111,154,85,0.4)",
    stroke: C.ink,
    strokeWidth: 0.65,
    roughness: 1,
    fillStyle: "solid",
  });

  return {
    width: W,
    height: yWater + 4,
    anchorX: cx,
    anchorY: yWater,
    scale: 0.38,
    parts,
  };
}

export type BuildingBuilder = () => BuildingDrawing;

/** Registry of POI building illustrations, keyed by the feature's `building`. */
export const BUILDINGS = {
  "montauk-club": montaukClub,
  "obama-brownstone": brownstone,
  "plane-crash": airliner,
  "old-stone-house": oldStoneHouse,
  "litchfield-villa": litchfieldVilla,
  "memorial-arch": memorialArch,
  "bailey-fountain": baileyFountain,
  "central-library": centralLibrary,
  "old-first-reformed": oldFirstReformed,
  "st-augustine": stAugustine,
  "memorial-presbyterian": memorialPresbyterian,
  "grace-methodist": graceMethodist,
  "st-francis-xavier": stFrancisXavier,
  "park-slope-library": parkSlopeLibrary,
  "sanders-theatre": sandersTheatre,
  "long-meadow": longMeadowFlower,
  "dog-beach": dogBeach,
  "botanic-garden": botanicGarden,
  "prospect-park-zoo": prospectParkZoo,
  "boathouse": boathouse,
  "lafayette-memorial": lafayetteMemorial,
  "endale-arch": endaleArch,
  "brooklyn-museum": brooklynMuseum,
  "beth-elohim": bethElohim,
  "park-slope-jewish-center": parkSlopeJewishCenter,
  "brooklyn-conservatory": brooklynConservatory,
  "ansonia-clock-factory": ansoniaClockFactory,
  "cronyn-house": cronynHouse,
  "eccentric-house": eccentricHouse,
  "barclays-center": barclaysCenter,
} as const satisfies Record<string, BuildingBuilder>;

export type BuildingKey = keyof typeof BUILDINGS;
