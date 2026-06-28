import rough from "roughjs";
import type { Options } from "roughjs/bin/core";

// A single shared generator turns SVG path strings into "sketchy" sub-paths we
// can render declaratively as React <path> elements (no imperative DOM).
const generator = rough.generator();

export interface RoughSubPath {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill?: string;
}

/**
 * Convert an SVG path `d` string into hand-drawn sub-paths. Returns one or more
 * pieces (e.g. a sketchy fill plus a wobbly outline) ready to render.
 */
export function roughen(d: string, options: Options): RoughSubPath[] {
  if (!d) return [];
  const drawable = generator.path(d, options);
  return generator.toPaths(drawable).map((p) => ({
    d: p.d,
    stroke: p.stroke,
    strokeWidth: typeof p.strokeWidth === "number" ? p.strokeWidth : 1,
    fill: p.fill && p.fill !== "none" ? p.fill : undefined,
  }));
}

export type { Options as RoughOptions };
