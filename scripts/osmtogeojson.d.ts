declare module "osmtogeojson" {
  import type { FeatureCollection } from "geojson";
  const osmtogeojson: (data: unknown, options?: Record<string, unknown>) => FeatureCollection;
  export default osmtogeojson;
}
