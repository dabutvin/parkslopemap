# AGENTS.md — notes for future agents

Project: an interactive, hand-drawn-style map of Park Slope, Brooklyn. Built from
real OpenStreetMap geometry styled to look illustrated. Read `README.md` first for
the user-facing overview; this file covers the non-obvious things.

## Status
- **Phase 1 (done):** neighborhood boundary, orientation, and look/feel.
- **Phase 2 (in progress):** points of interest as hand-drawn landmark buildings.
 The first POI (the Montauk Club) is in, clickable, and opens a detail drawer
 (name/category/description). The system is built to add more — see Phase 2 hints.
 The SVG is already structured for this — don't rebuild it, extend it.

## Architecture (where things live)
- `scripts/fetch-data.ts` — dev-only. Pulls from the Overpass API and writes
  `src/data/*.geojson`. NOT part of the app runtime.
- `src/data/*.geojson` — committed static data: boundary, Prospect Park, streets.
- `src/lib/projection.ts` — `d3-geo` Mercator fit + rotation.
- `src/lib/roughen.ts` — wraps `rough.js` to turn an SVG path `d` into sketchy
  sub-paths (returned as plain data, rendered declaratively — no imperative DOM).
- `src/lib/buildMap.ts` — **the heart of the project.** A *pure* function that
 takes the GeoJSON and produces a flat, serializable `MapModel` (paths, labels,
 POIs, compass heading). Shared by the React app and the offline preview renderer.
- `src/lib/buildings.ts` — pure, hand-authored landmark illustrations. Each
 builder returns local-space SVG path parts + a ground anchor; `buildMap.ts`
 roughens them and projects the anchor. Registered in `BUILDINGS` by key.
- `src/data/places.geojson` — committed POI points; each `building` prop names
 a builder in `BUILDINGS`, and optional `photo`/`photoAlt`/`photoCredit` props
 feed the detail drawer.
- `public/photos/` — committed POI photos, served at `/photos/...` (see Photos).
- `src/components/NeighborhoodMap.tsx` — renders the `MapModel` to SVG, plus the
 click-to-open detail drawer (the only stateful/interactive piece).
- `scripts/render-preview.ts` — rasterizes the same `MapModel` to a PNG.
- `scripts/_inspect-building.ts` — rasterizes a single building large, for art.

## How to verify changes WITHOUT a browser
This is the key workflow. The preview renderer uses the exact same `buildMapModel`,
so a PNG is a faithful check of geometry/orientation/layout (fonts differ — it
falls back to sans-serif; the real app uses Caveat/Patrick Hand):

```bash
npx tsx scripts/render-preview.ts        # default angle
npx tsx scripts/render-preview.ts 30     # try a rotation
```

Then open/inspect the generated `preview*.png` (git-ignored at repo root).

Caveat: the preview scripts only rasterize the static `MapModel`. The detail
drawer, photos, clicks, hover, pan/zoom are React-only — verify those in the
browser (`npm run dev`).

## Gotchas (these cost real time — read before touching map code)
1. **d3-geo polygon winding.** d3-geo treats polygons as spherical and expects
   **clockwise** outer rings. A counter-clockwise ring is read as "the whole globe
   minus this shape" and fills the entire canvas. `fetch-data.ts` rewinds the
   boundary and park (`rewind(..., { reverse: true })`). If a new polygon fills
   the background, this is why.
2. **Overpass needs a `User-Agent` header** or it returns `406 Not Acceptable`.
3. **OSM street names are like `"4th Avenue"`, not `"Fourth Avenue"`**, and
   `"Prospect Park West"` has no "Avenue". The border-stitching and avenue set in
   `fetch-data.ts` depend on exact names.
4. **GeoJSON is imported with `?raw` + `JSON.parse`** (Vite doesn't treat
   `.geojson` as a JSON module). Keep that pattern.
5. **Keep `buildMap.ts` pure and free of React/DOM/Vite imports** — the node
   preview script imports it directly.
6. **POI clicks vs. panning.** The map pans via pointer capture on the `<svg>`,
   so a child's `onClick` is unreliable. `NeighborhoodMap` instead records the
   `data-poi-id` under the press on pointer-down and treats a release with no
   real movement as a tap (opens the drawer; tapping empty map closes it). Don't
   put a CSS `transform` on `.ps-poi` — it overrides the SVG `transform` attribute
   that positions the building; use `filter`/`opacity` for hover/selected states.

## Conventions
- The running app makes **no network calls**; all data is committed GeoJSON and
  all images are committed under `public/`. To change map data, edit
  `fetch-data.ts` and re-run `npm run fetch-data`.
- Tunables: `DEFAULT_ANGLE` (orientation) in `projection.ts`; `COLORS` and
  `roughen(...)` options in `buildMap.ts`; CSS vars in `src/styles/map.css`.
- SVG layers are named (`ps-layer--park`, `ps-layer--streets`, etc.) so Phase 2
  highlights can hook in cleanly.
- Run `npm run build` (type-check + bundle) before declaring done.

## Phase 2 hints
- To add a POI: write a builder in `buildings.ts`, register it in `BUILDINGS`,
 then add a Point to `places.geojson` with a matching `building` property.
- Author building parts in local coords with a bottom-center-ish ground anchor;
 keep `buildings.ts` pure (no React/DOM/rough.js) so the preview script can use it.
- Tune a single building in isolation: `npx tsx scripts/_inspect-building.ts montauk-club`
 writes a large `building-<key>.png` (git-ignored) — much faster than the full map.
- Points are projected with the same `project()` from `buildMap.ts`, so markers
 line up; prefer extending `MapModel` over computing geometry in the component.
- Keep a building's parts within its `0..width` × `0..height` local box: the
 click hit-area and the bottom-center anchor assume that. The Montauk facade is
 authored top-down with a `ROOF` offset baked into the band constants, so to add
 anything above the cornice, grow `ROOF` rather than using negative coordinates.

### Photos
- Commit POI photos under `public/photos/` and reference them by absolute path
 (e.g. `"/photos/montauk-club-1910.jpg"`) in the `photo` prop — this is a plain
 URL string, NOT a Vite `import`, so it just works from data.
- Use **public-domain or compatibly-licensed** images only, and record the
 source/credit in `photoCredit` (shown under the photo). Prefer genuinely old /
 historical shots to match the illustrated, aged-paper feel.
