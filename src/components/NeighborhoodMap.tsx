import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
} from "geojson";
import { buildMapModel } from "../lib/buildMap";

import boundaryRaw from "../data/park-slope-boundary.geojson?raw";
import parkRaw from "../data/prospect-park.geojson?raw";
import streetsRaw from "../data/streets.geojson?raw";

const boundary = JSON.parse(boundaryRaw) as Feature<Polygon>;
const park = JSON.parse(parkRaw) as Feature<Polygon | MultiPolygon>;
const streets = JSON.parse(streetsRaw) as FeatureCollection<LineString | MultiLineString>;

const DESIGN_WIDTH = 1000;

// How far you can zoom in: the viewBox can shrink to 1/MAX_ZOOM of full extent.
const MAX_ZOOM = 8;

type ViewBox = { x: number; y: number; w: number; h: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function NeighborhoodMap() {
  const model = useMemo(
    () => buildMapModel({ boundary, park, streets }, { width: DESIGN_WIDTH }),
    []
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewBox>({
    x: 0,
    y: 0,
    w: model.width,
    h: model.height,
  });
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; view: ViewBox } | null>(
    null
  );

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
      panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, view };
    },
    [view]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    const svg = svgRef.current;
    if (!pan || !svg || pan.pointerId !== e.pointerId) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - pan.startX) / rect.width) * pan.view.w;
    const dy = ((e.clientY - pan.startY) / rect.height) * pan.view.h;
    setView(clampView({ ...pan.view, x: pan.view.x - dx, y: pan.view.y - dy }));
  }, [clampView]);

  const endPan = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (panRef.current?.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      panRef.current = null;
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
      </defs>

      <rect className="ps-map__paper" x="0" y="0" width={model.width} height={model.height} />

      <g className="ps-layer ps-layer--park">
        {model.parkPaths.map((p, i) => (
          <path key={`park-${i}`} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} />
        ))}
      </g>

      <g className="ps-layer ps-layer--neighborhood">
        {model.neighborhoodFill.map((p, i) => (
          <path key={`fill-${i}`} d={p.d} stroke="none" fill={p.fill ?? "#f7f0df"} />
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

      <g className="ps-layer ps-layer--labels">
        <text
          className="ps-label ps-label--park"
          x={model.parkLabel.x}
          y={model.parkLabel.y}
          transform={`rotate(${model.parkLabel.angle} ${model.parkLabel.x} ${model.parkLabel.y})`}
        >
          {model.parkLabel.name}
        </text>
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
