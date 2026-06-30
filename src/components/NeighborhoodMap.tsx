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
import streetsRaw from "../data/streets.geojson?raw";
import placesRaw from "../data/places.geojson?raw";

const boundary = JSON.parse(boundaryRaw) as Feature<Polygon>;
const park = JSON.parse(parkRaw) as Feature<Polygon | MultiPolygon>;
const parkTrails = JSON.parse(parkPathsRaw) as FeatureCollection<LineString | MultiLineString>;
const parkWater = JSON.parse(parkWaterRaw) as FeatureCollection<Polygon | MultiPolygon>;
const greens = JSON.parse(washingtonRaw) as Feature<Polygon | MultiPolygon>;
const greenSpaces = JSON.parse(greenSpacesRaw) as FeatureCollection<Polygon | MultiPolygon>;
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
    () => buildMapModel({ boundary, park, greens, greenSpaces, streets, parkTrails, parkWater, places }, { width: DESIGN_WIDTH }),
    []
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewBox>({
    x: 0,
    y: 0,
    w: model.width,
    h: model.height,
  });
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  // The detail drawer is fed by either a POI building or the clickable park label.
  const selectedPoi =
    model.pois.find((p) => p.id === selectedPoiId) ??
    (model.parkLabel.id === selectedPoiId ? model.parkLabel : null);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    view: ViewBox;
    poiId: string | null;
    moved: boolean;
  } | null>(null);

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

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setView((v) => {
        const fx = (clientX - rect.left) / rect.width;
        const fy = (clientY - rect.top) / rect.height;
        const px = v.x + fx * v.w;
        const py = v.y + fy * v.h;
        const w = v.w * factor;
        return clampView({ w, h: w * (model.height / model.width), x: px - fx * w, y: py - fy * w * (model.height / model.width) });
      });
    },
    [clampView, model.width, model.height]
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      // Capture which POI (if any) the press started on, before pointer capture
      // retargets later events to the <svg>.
      const hit = (e.target as Element).closest?.("[data-poi-id]");
      panRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        view,
        poiId: hit?.getAttribute("data-poi-id") ?? null,
        moved: false,
      };
    },
    [view]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    const svg = svgRef.current;
    if (!pan || !svg || pan.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - pan.startX, e.clientY - pan.startY) > 4) pan.moved = true;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - pan.startX) / rect.width) * pan.view.w;
    const dy = ((e.clientY - pan.startY) / rect.height) * pan.view.h;
    setView(clampView({ ...pan.view, x: pan.view.x - dx, y: pan.view.y - dy }));
  }, [clampView]);

  const endPan = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (pan?.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    panRef.current = null;
    // A press that didn't drag is a tap: open the building, or close the drawer
    // when tapping empty map.
    if (e.type === "pointerup" && !pan.moved) {
      setSelectedPoiId(pan.poiId);
    }
  }, []);

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
        <filter id="ps-paper" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey" result="soft">
            <feFuncA type="linear" slope="0.05" />
          </feComponentTransfer>
          <feComposite in="soft" in2="SourceGraphic" operator="over" />
        </filter>
        <clipPath id="ps-clip">
          <path d={model.boundaryD} />
        </clipPath>
        <clipPath id="ps-park-clip">
          <path d={model.parkD} />
        </clipPath>
      </defs>

      <rect className="ps-map__paper" x="0" y="0" width={model.width} height={model.height} />

      <g className="ps-layer ps-layer--park">
        {model.parkPaths.map((p, i) => (
          <path key={`park-${i}`} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} />
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
