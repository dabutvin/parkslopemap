import type { Feature, FeatureCollection, Point } from "geojson";
import type { BuildingKey } from "./buildings";
import { BUILDINGS } from "./buildings";

/** Required GeoJSON properties for every POI in `places.geojson`. */
export interface PlaceProperties {
  id: string;
  name: string;
  category: string;
  building: BuildingKey;
  description: string;
  photo: string;
  photoAlt: string;
  photoCredit: string;
  displayOffsetX?: number;
  displayOffsetY?: number;
}

export type PlaceFeature = Feature<Point, PlaceProperties>;
export type PlacesCollection = FeatureCollection<Point, PlaceProperties>;

/** Keys checked on every place feature (optional props are validated separately). */
export const PLACE_REQUIRED_FIELDS = [
  "id",
  "name",
  "category",
  "building",
  "description",
  "photo",
  "photoAlt",
  "photoCredit",
] as const satisfies readonly (keyof PlaceProperties)[];

export interface PlaceValidationIssue {
  index: number;
  id?: string;
  message: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

/** Validate a parsed `places.geojson` FeatureCollection. */
export function validatePlaces(places: unknown): PlaceValidationIssue[] {
  const issues: PlaceValidationIssue[] = [];

  if (!places || typeof places !== "object") {
    return [{ index: -1, message: "places data must be an object" }];
  }

  const collection = places as FeatureCollection<Point>;
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    return [{ index: -1, message: "places data must be a GeoJSON FeatureCollection" }];
  }

  const seenIds = new Set<string>();
  const buildingKeys = new Set<string>(Object.keys(BUILDINGS));

  collection.features.forEach((feature, index) => {
    const idHint = typeof feature.properties?.id === "string" ? feature.properties.id : undefined;
    const ctx = { index, id: idHint };

    if (feature.type !== "Feature") {
      issues.push({ ...ctx, message: "feature must have type 'Feature'" });
      return;
    }

    if (feature.geometry?.type !== "Point" || !Array.isArray(feature.geometry.coordinates)) {
      issues.push({ ...ctx, message: "geometry must be a Point with coordinates" });
      return;
    }

    const [lon, lat] = feature.geometry.coordinates;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      issues.push({ ...ctx, message: "geometry coordinates must be finite numbers" });
    }

    const props = feature.properties;
    if (!props || typeof props !== "object") {
      issues.push({ ...ctx, message: "properties must be an object" });
      return;
    }

    for (const field of PLACE_REQUIRED_FIELDS) {
      if (!(field in props)) {
        issues.push({ ...ctx, message: `missing required property '${field}'` });
        continue;
      }
      if (!isNonEmptyString(props[field])) {
        issues.push({ ...ctx, message: `property '${field}' must be a non-empty string` });
      }
    }

    if (isNonEmptyString(props.building) && !buildingKeys.has(props.building)) {
      issues.push({
        ...ctx,
        message: `unknown building '${props.building}' (not registered in BUILDINGS)`,
      });
    }

    if (!isOptionalNumber(props.displayOffsetX)) {
      issues.push({ ...ctx, message: "displayOffsetX must be a finite number when present" });
    }
    if (!isOptionalNumber(props.displayOffsetY)) {
      issues.push({ ...ctx, message: "displayOffsetY must be a finite number when present" });
    }

    if (isNonEmptyString(props.id)) {
      if (seenIds.has(props.id)) {
        issues.push({ ...ctx, message: `duplicate id '${props.id}'` });
      }
      seenIds.add(props.id);
    }
  });

  return issues;
}
