"use client";

import { useState } from "react";

type Point = { day: string; value: number };

function shortDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, date)));
}

/** One series of daily counts, as thin bars on a zero baseline. */
export function BarChart({ points, unit }: { points: Point[]; unit: [string, string] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((point) => point.value));
  const top = max <= 4 ? max : Math.ceil(max / 4) * 4;
  const label = (value: number) => `${value} ${value === 1 ? unit[0] : unit[1]}`;
  const shown = active === null ? null : points[active];
  const ticks = points.length <= 8 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <figure className="chart" onMouseLeave={() => setActive(null)}>
      <div className="chart-plot">
        <span className="chart-max">{top}</span>
        <div className="chart-grid" aria-hidden="true"><i /><i /></div>
        <div className="chart-bars">
          {points.map((point, index) => (
            <button
              key={point.day}
              type="button"
              className={index === active ? "chart-col is-active" : "chart-col"}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${shortDay(point.day)}: ${label(point.value)}`}
            >
              <span className="chart-bar" style={{ height: point.value ? `${(point.value / top) * 100}%` : "0" }} />
            </button>
          ))}
        </div>
        {shown ? (
          <div className="chart-tip" style={{ left: `${((active! + 0.5) / points.length) * 100}%` }} role="status">
            <b>{label(shown.value)}</b>
            <span>{shortDay(shown.day)}</span>
          </div>
        ) : null}
      </div>
      <div className="chart-axis" aria-hidden="true">
        {ticks.map((index) => (
          <span key={index} style={{ left: `${((index + 0.5) / points.length) * 100}%` }}>{shortDay(points[index].day)}</span>
        ))}
      </div>
    </figure>
  );
}
