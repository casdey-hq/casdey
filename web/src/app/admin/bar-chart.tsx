"use client";

import { useState } from "react";
import type { Point } from "@/lib/chart-points";

/** One series of counts (per day or per hour), as thin bars on a zero baseline. */
export function BarChart({ points, unit }: { points: Point[]; unit: [string, string] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((point) => point.value));
  const top = max <= 4 ? max : Math.ceil(max / 4) * 4;
  const label = (value: number) => `${value} ${value === 1 ? unit[0] : unit[1]}`;
  const shown = active === null ? null : points[active];
  const ticks = points.length <= 8 ? points.map((_, i) => i) : points.length === 24 ? [0, 6, 12, 18, 23] : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <figure className="chart" onMouseLeave={() => setActive(null)}>
      <div className="chart-plot">
        <span className="chart-max">{top}</span>
        <div className="chart-grid" aria-hidden="true"><i /><i /></div>
        <div className="chart-bars">
          {points.map((point, index) => (
            <button
              key={point.key}
              type="button"
              className={index === active ? "chart-col is-active" : "chart-col"}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${point.label}: ${label(point.value)}`}
            >
              <span className="chart-bar" style={{ height: point.value ? `${(point.value / top) * 100}%` : "0" }} />
            </button>
          ))}
        </div>
        {shown ? (
          <div className="chart-tip" style={{ left: `${((active! + 0.5) / points.length) * 100}%` }} role="status">
            <b>{label(shown.value)}</b>
            <span>{shown.label}</span>
          </div>
        ) : null}
      </div>
      <div className="chart-axis" aria-hidden="true">
        {ticks.map((index) => (
          <span key={index} style={{ left: `${((index + 0.5) / points.length) * 100}%` }}>{points[index].label}</span>
        ))}
      </div>
    </figure>
  );
}
