import { geoMercator, geoPath, type GeoProjection, type GeoPath } from "d3-geo";
import type { Feature, Position } from "geojson";

export interface MapProjection {
  projection: GeoProjection;
  path: GeoPath;
  /** Project a [lon, lat] pair to [x, y] screen coordinates. */
  project: (coord: Position) => [number, number];
}

export interface ProjectionOptions {
  width: number;
  height: number;
  /** Inner padding (px) so the drawing never touches the edges. */
  padding?: number;
  /**
   * Extra space (px) reserved on the right so the neighborhood sits left of
   * center, leaving room for Prospect Park to show as a band on the east.
   */
  insetRight?: number;
  /**
   * Extra space (px) reserved at the top so the neighborhood sits below center,
   * leaving headroom for the green wedge NE of the park (Mount Prospect Park /
   * Brooklyn Botanic Garden) to show above Flatbush Avenue.
   */
  insetTop?: number;
  /**
   * Post-projection rotation in degrees. Park Slope's street grid sits on a
   * diagonal versus true north; rotating makes the avenues read vertically so
   * the map looks like a deliberately drawn illustration rather than a tilted
   * satellite view.
   */
  angle?: number;
}

export const DEFAULT_ANGLE = 30;

/**
 * Build a Mercator projection fitted to the neighborhood boundary, plus a
 * matching geoPath generator and a point projector for label placement.
 */
export function createProjection(
  boundary: Feature,
  { width, height, padding = 48, insetRight = 0, insetTop = 0, angle = DEFAULT_ANGLE }: ProjectionOptions
): MapProjection {
  const projection = geoMercator().angle(angle);
  projection.fitExtent(
    [
      [padding, padding + insetTop],
      [width - padding - insetRight, height - padding],
    ],
    boundary
  );

  const path = geoPath(projection);
  const project = (coord: Position): [number, number] =>
    (projection(coord as [number, number]) as [number, number]) ?? [0, 0];

  return { projection, path, project };
}
