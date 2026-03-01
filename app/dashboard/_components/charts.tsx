"use client";

import { useMemo, useState } from "react";

type Point = { label: string; value: number };

function formatCurrency(value: number) {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

export function LineChart({ data }: { data: Point[] }) {
  const [hovered, setHovered] = useState<{ x: number; y: number; label: string; value: number } | null>(
    null,
  );

  const chart = useMemo(() => {
    const width = 760;
    const height = 240;
    const padX = 46;
    const padY = 20;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const maxValue = Math.max(1, ...data.map((item) => item.value));

    const points = data.map((item, index) => {
      const x = padX + (index / Math.max(1, data.length - 1)) * innerW;
      const y = padY + innerH - (item.value / maxValue) * innerH;
      return { ...item, x, y };
    });

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");

    return { width, height, padX, padY, innerW, innerH, points, path, maxValue };
  }, [data]);

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="line-chart" role="img" aria-label="Grafik tren pembayaran">
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = chart.padY + (tick / 4) * chart.innerH;
          const value = chart.maxValue - (tick / 4) * chart.maxValue;
          return (
            <g key={tick}>
              <line x1={chart.padX} x2={chart.padX + chart.innerW} y1={y} y2={y} className="chart-grid" />
              <text x={8} y={y + 4} className="chart-axis">{(value / 1000000).toFixed(1)}jt</text>
            </g>
          );
        })}

        <path d={chart.path} className="chart-line" />

        {chart.points.map((point) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r={4}
              className="chart-dot"
              onMouseEnter={() => setHovered({ x: point.x, y: point.y, label: point.label, value: point.value })}
              onMouseLeave={() => setHovered(null)}
            />
          </g>
        ))}

        {chart.points.map((point, index) => {
          if (index % Math.max(1, Math.floor(chart.points.length / 6)) !== 0 && index !== chart.points.length - 1) {
            return null;
          }
          return (
            <text key={`${point.label}-axis`} x={point.x - 16} y={chart.height - 4} className="chart-axis">
              {point.label}
            </text>
          );
        })}
      </svg>

      {hovered ? (
        <div className="chart-tooltip" style={{ left: hovered.x / 7.6 + 8, top: hovered.y / 2.4 - 12 }}>
          <p>{hovered.label}</p>
          <strong>{formatCurrency(hovered.value)}</strong>
        </div>
      ) : null}
    </div>
  );
}

export function BarChart({ data }: { data: Point[] }) {
  const [hovered, setHovered] = useState<{ label: string; value: number } | null>(null);
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="bar-chart">
      {data.map((item) => (
        <div key={item.label} className="bar-item">
          <span>{item.label}</span>
          <button
            type="button"
            className="bar-track"
            onMouseEnter={() => setHovered({ label: item.label, value: item.value })}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="bar-fill" style={{ width: `${Math.max(3, (item.value / maxValue) * 100)}%` }} />
          </button>
          <strong>{Math.round(item.value / 1000).toLocaleString("id-ID")}k</strong>
        </div>
      ))}
      {hovered ? (
        <div className="bar-tooltip">
          <p>{hovered.label}</p>
          <strong>{formatCurrency(hovered.value)}</strong>
        </div>
      ) : null}
    </div>
  );
}
