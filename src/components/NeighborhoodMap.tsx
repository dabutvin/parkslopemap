import { useMemo } from "react";
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

export function NeighborhoodMap() {
  const model = useMemo(
    () => buildMapModel({ boundary, park, streets }, { width: DESIGN_WIDTH }),
    []
  );

  return (
    <svg
      className="ps-map"
      viewBox={`0 0 ${model.width} ${model.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Hand-drawn map of the Park Slope neighborhood in Brooklyn"
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
      </g>

      <Compass x={88} y={96} radius={40} northAngle={model.northAngle} />
    </svg>
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
