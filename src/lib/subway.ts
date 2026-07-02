/**
 * Subway-stop decorations: small MTA-style line bullets placed on the map as
 * non-clickable markers. Data lives in `src/data/subway-stops.geojson`.
 */

export interface SubwayStopProperties {
  id: string;
  name: string;
  /** Comma-separated MTA line letters, e.g. `"F,G"` or `"B,Q,S"`. */
  lines: string;
}

export interface SubwayBulletPart {
  line: string;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  /** Plain SVG circle path, roughened by `buildMap.ts`. */
  d: string;
}

export interface SubwayMarkerDrawing {
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  scale: number;
  bullets: SubwayBulletPart[];
}

/** Muted MTA line colors that read on the warm paper palette. */
export const SUBWAY_LINE_COLORS: Record<string, string> = {
  "1": "#c45a52",
  "2": "#c45a52",
  "3": "#c45a52",
  "4": "#3d6b8a",
  "5": "#3d6b8a",
  "6": "#3d6b8a",
  "7": "#b89a4a",
  A: "#1a4f8a",
  B: "#c86a38",
  C: "#1a4f8a",
  D: "#c86a38",
  E: "#1a4f8a",
  F: "#c86a38",
  G: "#5a9a48",
  J: "#8a6840",
  L: "#8a8a8a",
  M: "#c45a52",
  N: "#d4b840",
  Q: "#d4b840",
  R: "#d4b840",
  S: "#7a7a7a",
  W: "#d4b840",
  Z: "#8a6840",
};

const DEFAULT_LINE_COLOR = "#6a5a4a";

export function parseSubwayLines(lines: string): string[] {
  return [...new Set(lines.split(/[,/\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];
}

function circle(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
}

/** Build a stacked set of MTA line bullets in local coordinates. */
export function buildSubwayMarker(lines: string[]): SubwayMarkerDrawing {
  const parsed = parseSubwayLines(lines.join(","));
  const r = 10;
  const step = 22;
  const pad = 4;
  const height = parsed.length * step + pad * 2;
  const width = r * 2 + pad * 2;
  const cx = width / 2;

  const bullets: SubwayBulletPart[] = parsed.map((line, i) => {
    const cy = pad + r + i * step;
    return {
      line,
      cx,
      cy,
      r,
      fill: SUBWAY_LINE_COLORS[line] ?? DEFAULT_LINE_COLOR,
      d: circle(cx, cy, r),
    };
  });

  return {
    width,
    height,
    anchorX: cx,
    anchorY: height - pad,
    scale: 0.52,
    bullets,
  };
}
