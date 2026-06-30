import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
  Polygon,
  MultiPolygon,
} from "geojson";
import { buildMapModel } from "../lib/buildMap";

import boundaryRaw from "../data/park-slope-boundary.geojson?raw";
import parkRaw from "../data/prospect-park.geojson?raw";
import parkPathsRaw from "../data/prospect-park-paths.geojson?raw";
import parkWaterRaw from "../data/prospect-park-water.geojson?raw";
import washingtonRaw from "../data/washington-park.geojson?raw";
import greenSpacesRaw from "../data/green-spaces.geojson?raw";
import northGreensRaw from "../data/north-greens.geojson?raw";
import northStreetsRaw from "../data/north-streets.geojson?raw";
import streetsRaw from "../data/streets.geojson?raw";
import placesRaw from "../data/places.geojson?raw";

const boundary = JSON.parse(boundaryRaw) as Feature<Polygon>;
const park = JSON.parse(parkRaw) as Feature<Polygon | MultiPolygon>;
const parkTrails = JSON.parse(parkPathsRaw) as FeatureCollection<LineString | MultiLineString>;
const parkWater = JSON.parse(parkWaterRaw) as FeatureCollection<Polygon | MultiPolygon>;
const greens = JSON.parse(washingtonRaw) as Feature<Polygon | MultiPolygon>;
const greenSpaces = JSON.parse(greenSpacesRaw) as FeatureCollection<Polygon | MultiPolygon>;
const northGreens = JSON.parse(northGreensRaw) as FeatureCollection<Polygon | MultiPolygon>;
const northStreets = JSON.parse(northStreetsRaw) as FeatureCollection<LineString | MultiLineString>;
const streets = JSON.parse(streetsRaw) as FeatureCollection<LineString | MultiLineString>;
const places = JSON.parse(placesRaw) as FeatureCollection<Point>;

const DESIGN_WIDTH = 1000;

// How far you can zoom in: the viewBox can shrink to 1/MAX_ZOOM of full extent.
const MAX_ZOOM = 8;

type ViewBox = { x: number; y: number; w: number; h: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function NeighborhoodMap() {
  const model = useMemo(
    () => buildMapModel({ boundary, park, greens, greenSpaces, northGreens, northStreets, streets, parkTrails, parkWater, places }, { width: DESIGN_WIDTH }),
    []
  );

  // Warm the browser cache with every POI photo on mount so the detail drawer's
  // image is already decoded when a building is tapped (no "pop in").
  useEffect(() => {
    const urls = new Set<string>();
    for (const poi of model.pois) if (poi.photo) urls.add(poi.photo);
    if (model.parkLabel.photo) urls.add(model.parkLabel.photo);
    for (const url of urls) {
      const img = new Image();
      img.src = url;
    }
  }, [model]);

  const svgRef = useRef<SVGSVGElement>(null);
  const ratio = model.height / model.width;
  const [view, setView] = useState<ViewBox>(() => {
    // On phones, fitting the whole neighborhood makes every label microscopic.
    // Start zoomed into the core so it's legible; pinch/buttons take it from there.
    const isNarrow = typeof window !== "undefined" && window.innerWidth < 640;
    if (isNarrow) {
      const w = model.width / 1.8;
      return { w, h: w * ratio, x: (model.width - w) / 2, y: (model.height - w * ratio) / 2 };
    }
    return { x: 0, y: 0, w: model.width, h: model.height };
  });
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  // The detail drawer is fed by either a POI building or the clickable park label.
  const selectedPoi =
    model.pois.find((p) => p.id === selectedPoiId) ??
    (model.parkLabel.id === selectedPoiId ? model.parkLabel : null);
  // Live mirror of `view` so gesture handlers can read the latest value without
  // being torn down/recreated on every frame.
  const viewRef = useRef(view);
  viewRef.current = view;

  // All active pointers on the SVG, keyed by pointerId, in client coords. One
  // pointer => pan; two => pinch-zoom.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panRef = useRef<{
    startX: number;
    startY: number;
    view: ViewBox;
    poiId: string | null;
    moved: boolean;
  } | null>(null);
  const pinchRef = useRef<{
    startDist: number;
    startView: ViewBox;
    // World-space point under the initial finger midpoint, kept pinned to the
    // current midpoint as the gesture moves.
    px: number;
    py: number;
  } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  // Keep the view within the map bounds and within the allowed zoom range.
  const clampView = useCallback(
    (next: ViewBox): ViewBox => {
      const minW = model.width / MAX_ZOOM;
      const w = clamp(next.w, minW, model.width);
      const h = w * (model.height / model.width);
      return {
        w,
        h,
        x: clamp(next.x, 0, model.width - w),
        y: clamp(next.y, 0, model.height - h),
      };
    },
    [model.width, model.height]
  );

  // Write the camera straight to the SVG attribute (no React render). Gestures
  // call this every frame so panning/zooming is a single DOM write instead of a
  // full reconciliation of the hundreds of <path> elements.
  const applyView = useCallback((v: ViewBox) => {
    viewRef.current = v;
    svgRef.current?.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
  }, []);

  // Sync the live camera back into React state so derived UI (street-label
  // visibility, the reset button) catches up. Debounced so a burst of moves
  // triggers at most one render once motion settles.
  const commitTimer = useRef<number | undefined>(undefined);
  const scheduleCommit = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => setView(viewRef.current), 120);
  }, []);
  const commitNow = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    setView(viewRef.current);
  }, []);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const v = viewRef.current;
      const fx = (clientX - rect.left) / rect.width;
      const fy = (clientY - rect.top) / rect.height;
      const px = v.x + fx * v.w;
      const py = v.y + fy * v.h;
      const w = v.w * factor;
      applyView(clampView({ w, h: w * ratio, x: px - fx * w, y: py - fy * w * ratio }));
      scheduleCommit();
    },
    [applyView, clampView, ratio, scheduleCommit]
  );

  // Native, non-passive wheel listener so we can preventDefault the page scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.0015);
      zoomAt(e.clientX, e.clientY, factor);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Begin a two-finger pinch from whatever pointers are currently down.
  const beginPinch = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return;
    const rect = svg.getBoundingClientRect();
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    const fx = (midX - rect.left) / rect.width;
    const fy = (midY - rect.top) / rect.height;
    const v = viewRef.current;
    panRef.current = null;
    pinchRef.current = {
      startDist: dist || 1,
      startView: v,
      px: v.x + fx * v.w,
      py: v.y + fy * v.h,
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const count = pointersRef.current.size;
      if (count >= 2) {
        beginPinch();
        return;
      }
      // Capture which POI (if any) the press started on, before pointer capture
      // retargets later events to the <svg>.
      const hit = (e.target as Element).closest?.("[data-poi-id]");
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        view: viewRef.current,
        poiId: hit?.getAttribute("data-poi-id") ?? null,
        moved: false,
      };
    },
    [beginPinch]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      const tracked = pointersRef.current.get(e.pointerId);
      if (!svg || !tracked) return;
      tracked.x = e.clientX;
      tracked.y = e.clientY;
      const rect = svg.getBoundingClientRect();

      const pinch = pinchRef.current;
      if (pinch && pointersRef.current.size >= 2) {
        const pts = [...pointersRef.current.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const fx = (midX - rect.left) / rect.width;
        const fy = (midY - rect.top) / rect.height;
        const w = pinch.startView.w * (pinch.startDist / dist);
        applyView(
          clampView({ w, h: w * ratio, x: pinch.px - fx * w, y: pinch.py - fy * w * ratio })
        );
        return;
      }

      const pan = panRef.current;
      if (!pan) return;
      if (Math.hypot(e.clientX - pan.startX, e.clientY - pan.startY) > 4) pan.moved = true;
      const dx = ((e.clientX - pan.startX) / rect.width) * pan.view.w;
      const dy = ((e.clientY - pan.startY) / rect.height) * pan.view.h;
      applyView(clampView({ ...pan.view, x: pan.view.x - dx, y: pan.view.y - dy }));
    },
    [applyView, clampView, ratio]
  );

  const endPan = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      pointersRef.current.delete(e.pointerId);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer may already be released; ignore.
      }

      // Winding down a pinch. If one finger remains, hand control back to pan
      // (seeded from the survivor) so the map doesn't jump; otherwise the
      // gesture is over, so commit the live camera to state.
      if (pinchRef.current) {
        if (pointersRef.current.size < 2) {
          pinchRef.current = null;
          const survivor = [...pointersRef.current.values()][0];
          if (survivor) {
            panRef.current = { startX: survivor.x, startY: survivor.y, view: viewRef.current, poiId: null, moved: true };
          } else {
            panRef.current = null;
            commitNow();
          }
        }
        return;
      }

      const pan = panRef.current;
      if (!pan) return;
      panRef.current = null;
      if (e.type !== "pointerup" || pan.moved) {
        // A drag (or cancel) ended — sync state to the live camera.
        commitNow();
        return;
      }

      // A press that didn't drag is a tap. Double-tapping empty map zooms in;
      // a single tap opens a building or closes the drawer.
      const now = e.timeStamp;
      const last = lastTapRef.current;
      const isDoubleTap =
        !pan.poiId &&
        last != null &&
        now - last.t < 300 &&
        Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30;
      if (isDoubleTap) {
        lastTapRef.current = null;
        zoomAt(e.clientX, e.clientY, 1 / 1.8);
        return;
      }
      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };
      setSelectedPoiId(pan.poiId);
    },
    [zoomAt, commitNow]
  );

  const zoomByButton = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    },
    [zoomAt]
  );

  const resetView = useCallback(
    () => setView({ x: 0, y: 0, w: model.width, h: model.height }),
    [model.width, model.height]
  );

  // Close the detail drawer with Escape.
  useEffect(() => {
    if (!selectedPoiId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPoiId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPoiId]);

  const isZoomed = view.w < model.width;
  const zoom = model.width / view.w;
  const visibleStreetLabels = model.streetLabels.filter(
    (label) => zoom >= (label.minZoom ?? Infinity)
  );

  return (
    <div className="ps-map__wrap">
    <svg
      ref={svgRef}
      className="ps-map"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Hand-drawn map of the Park Slope neighborhood in Brooklyn"
      style={{ cursor: panRef.current ? "grabbing" : "grab", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      <defs>
        <clipPath id="ps-clip">
          <path d={model.boundaryD} />
        </clipPath>
        <clipPath id="ps-park-clip">
          <path d={model.parkD} />
        </clipPath>
        {model.northClip && (
          <clipPath id="ps-north-clip">
            <rect
              x={model.northClip.x}
              y={model.northClip.y}
              width={model.northClip.width}
              height={model.northClip.height}
            />
          </clipPath>
        )}
      </defs>

      <rect className="ps-map__paper" x="0" y="0" width={model.width} height={model.height} />

      <g className="ps-layer ps-layer--park">
        {model.parkPaths.map((p, i) => (
          <path key={`park-${i}`} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} />
        ))}
      </g>

      <g className="ps-layer ps-layer--north-green">
        {model.northGreenPaths.map((p) => (
          <path key={p.key} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} />
        ))}
      </g>

      <g className="ps-layer ps-layer--water" clipPath="url(#ps-park-clip)">
        {model.parkWaterPaths.map((p) => (
          <path key={p.key} className="ps-water" d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} strokeLinejoin="round" />
        ))}
      </g>

      <g className="ps-layer ps-layer--trails" clipPath="url(#ps-park-clip)">
        {model.parkTrailPaths.map((p) => (
          <path key={p.key} className="ps-trail" d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" />
        ))}
        {model.parkDrivePaths.map((p) => (
          <path key={p.key} className="ps-trail ps-trail--drive" d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g className="ps-layer ps-layer--neighborhood">
        {model.neighborhoodFill.map((p, i) => (
          <path key={`fill-${i}`} d={p.d} stroke="none" fill={p.fill ?? "#f7f0df"} />
        ))}
      </g>

      <g className="ps-layer ps-layer--green">
        {model.greenPaths.map((p, i) => (
          <path key={`green-${i}`} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} />
        ))}
      </g>

      <g className="ps-layer ps-layer--streets" clipPath="url(#ps-clip)">
        {model.streetPaths.map((p) => (
          <path key={p.key} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g className="ps-layer ps-layer--boundary">
        {model.boundaryOutline.map((p, i) => (
          <path
            key={`outline-${i}`}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>

      {/* Grand Army Plaza, drawn unclipped so it spills beyond the boundary. */}
      <g className="ps-layer ps-layer--plaza">
        {model.plazaPaths.map((p) => (
          <path key={p.key} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} strokeLinecap="round" />
        ))}
      </g>

      {/* Flatbush Ave / Eastern Pkwy / Washington Ave, framing the northern wedge. */}
      <g
        className="ps-layer ps-layer--north-streets"
        clipPath={model.northClip ? "url(#ps-north-clip)" : undefined}
      >
        {model.northStreetPaths.map((p) => (
          <path key={p.key} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" />
        ))}
      </g>

      <g className="ps-layer ps-layer--places">
        {model.pois.map((poi) => (
          <g
            key={poi.id}
            className={`ps-poi${poi.id === selectedPoiId ? " ps-poi--selected" : ""}`}
            data-poi-id={poi.id}
            role="button"
            tabIndex={0}
            aria-label={`${poi.name}${poi.category ? `, ${poi.category}` : ""}`}
            aria-pressed={poi.id === selectedPoiId}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedPoiId(poi.id);
              }
            }}
            transform={`translate(${poi.x} ${poi.y}) scale(${poi.scale}) translate(${-poi.anchorX} ${-poi.anchorY})`}
          >
            {/* Invisible hit area so the whole footprint is easy to click. */}
            <rect
              className="ps-poi__hit"
              x={-6}
              y={-6}
              width={poi.width + 12}
              height={poi.height + 12}
              fill="transparent"
            />
            {poi.parts.map((p) => (
              <path
                key={p.key}
                d={p.d}
                stroke={p.stroke}
                strokeWidth={p.strokeWidth}
                fill={p.fill ?? "none"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </g>
        ))}
      </g>

      <g className="ps-layer ps-layer--labels">
        <text
          className={`ps-label ps-label--park ps-label--clickable${model.parkLabel.id === selectedPoiId ? " ps-label--selected" : ""}`}
          x={model.parkLabel.x}
          y={model.parkLabel.y}
          transform={`rotate(${model.parkLabel.angle} ${model.parkLabel.x} ${model.parkLabel.y})`}
          data-poi-id={model.parkLabel.id}
          role="button"
          tabIndex={0}
          aria-label={`${model.parkLabel.name}, ${model.parkLabel.category}`}
          aria-pressed={model.parkLabel.id === selectedPoiId}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelectedPoiId(model.parkLabel.id);
            }
          }}
        >
          {model.parkLabel.name}
        </text>
        {model.greenLabel && (
          <text
            className="ps-label ps-label--green"
            x={model.greenLabel.x}
            y={model.greenLabel.y}
          >
            {model.greenLabel.name}
          </text>
        )}
        {model.northGreenLabels.map((label) => (
          <text
            key={label.name}
            className="ps-label ps-label--north-green"
            x={label.x}
            y={label.y}
          >
            {label.name}
          </text>
        ))}
        {model.avenueLabels.map((label) => (
          <text
            key={label.name}
            className="ps-label ps-label--avenue"
            x={label.x}
            y={label.y}
            transform={`rotate(${label.angle} ${label.x} ${label.y})`}
          >
            {label.name}
          </text>
        ))}
        {visibleStreetLabels.map((label) => (
          <text
            key={label.name}
            className="ps-label ps-label--street"
            x={label.x}
            y={label.y}
            transform={`rotate(${label.angle} ${label.x} ${label.y})`}
          >
            {label.name}
          </text>
        ))}
        {model.pois.map((poi) => (
          <text
            key={poi.id}
            className="ps-label ps-label--poi"
            x={poi.labelX}
            y={poi.labelY}
          >
            {poi.name}
          </text>
        ))}
      </g>

      <Compass x={88} y={96} radius={40} northAngle={model.northAngle} />
    </svg>

      {/* Paper grain lives outside the zooming SVG so the costly feTurbulence
          rasterizes once and is never recomputed while panning/zooming. */}
      <svg className="ps-grain" aria-hidden="true" preserveAspectRatio="none">
        <filter id="ps-grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey">
            <feFuncA type="linear" slope="0.05" />
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#ps-grain-filter)" />
      </svg>

      <div className="ps-zoom" role="group" aria-label="Zoom controls">
        <button type="button" className="ps-zoom__btn" onClick={() => zoomByButton(1 / 1.4)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="ps-zoom__btn" onClick={() => zoomByButton(1.4)} aria-label="Zoom out">
          −
        </button>
        <button
          type="button"
          className="ps-zoom__btn ps-zoom__btn--reset"
          onClick={resetView}
          disabled={!isZoomed}
          aria-label="Reset zoom"
          title="Reset"
        >
          ⤢
        </button>
      </div>

      <aside
        className={`ps-drawer${selectedPoi ? " ps-drawer--open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-hidden={!selectedPoi}
        aria-label={selectedPoi ? selectedPoi.name : "Place details"}
      >
        {selectedPoi && (
          <>
            <button
              type="button"
              className="ps-drawer__close"
              onClick={() => setSelectedPoiId(null)}
              aria-label="Close details"
            >
              ×
            </button>
            {selectedPoi.photo && (
              <figure className="ps-drawer__photo">
                <img src={selectedPoi.photo} alt={selectedPoi.photoAlt ?? selectedPoi.name} />
                {selectedPoi.photoCredit && (
                  <figcaption className="ps-drawer__credit">{selectedPoi.photoCredit}</figcaption>
                )}
              </figure>
            )}
            {selectedPoi.category && (
              <p className="ps-drawer__category">{selectedPoi.category}</p>
            )}
            <h2 className="ps-drawer__title">{selectedPoi.name}</h2>
            <p className="ps-drawer__body">{selectedPoi.description}</p>
          </>
        )}
      </aside>
    </div>
  );
}

function Compass({
  x,
  y,
  radius,
  northAngle,
}: {
  x: number;
  y: number;
  radius: number;
  northAngle: number;
}) {
  const rad = (northAngle * Math.PI) / 180;
  const tip: [number, number] = [x + Math.cos(rad) * radius, y + Math.sin(rad) * radius];
  const tail: [number, number] = [x - Math.cos(rad) * radius * 0.7, y - Math.sin(rad) * radius * 0.7];
  const label: [number, number] = [x + Math.cos(rad) * (radius + 16), y + Math.sin(rad) * (radius + 16)];
  return (
    <g className="ps-compass" aria-hidden="true">
      <circle cx={x} cy={y} r={radius} className="ps-compass__ring" />
      <line x1={tail[0]} y1={tail[1]} x2={tip[0]} y2={tip[1]} className="ps-compass__needle" />
      <circle cx={x} cy={y} r={3} className="ps-compass__hub" />
      <text x={label[0]} y={label[1]} className="ps-compass__n">
        N
      </text>
    </g>
  );
}
