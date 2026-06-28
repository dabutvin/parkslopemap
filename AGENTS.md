# AGENTS.md — notes for future agents

Project: an interactive, hand-drawn-style map of Park Slope, Brooklyn. Built from
real OpenStreetMap geometry styled to look illustrated. Read `README.md` first for
the user-facing overview; this file covers the non-obvious things.

## Status
- **Phase 1 (done):** neighborhood boundary, orientation, and look/feel.
- **Phase 2 (next):** highlight institutions + history with click/hover detail.
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
  compass heading). Shared by the React app and the offline preview renderer.
- `src/components/NeighborhoodMap.tsx` — renders the `MapModel` to SVG.
- `scripts/render-preview.ts` — rasterizes the same `MapModel` to a PNG.

## How to verify changes WITHOUT a browser
This is the key workflow. The preview renderer uses the exact same `buildMapModel`,
so a PNG is a faithful check of geometry/orientation/layout (fonts differ — it
falls back to sans-serif; the real app uses Caveat/Patrick Hand):

```bash
npx tsx scripts/render-preview.ts        # default angle
npx tsx scripts/render-preview.ts 30     # try a rotation
```

Then open/inspect the generated `preview*.png` (git-ignored at repo root).

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

## Conventions
- The running app makes **no network calls**; all data is committed GeoJSON.
  To change data, edit `fetch-data.ts` and re-run `npm run fetch-data`.
- Tunables: `DEFAULT_ANGLE` (orientation) in `projection.ts`; `COLORS` and
  `roughen(...)` options in `buildMap.ts`; CSS vars in `src/styles/map.css`.
- SVG layers are named (`ps-layer--park`, `ps-layer--streets`, etc.) so Phase 2
  highlights can hook in cleanly.
- Run `npm run build` (type-check + bundle) before declaring done.

## Phase 2 hints
- Add highlights as a new committed data file (e.g. `src/data/places.geojson`
  with name/category/description) and a new layer in the `MapModel` + component.
- Project points with the same `project()` from `buildMap.ts` so markers line up.
- Prefer extending `MapModel` over computing geometry inside the component.
