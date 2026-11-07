import React from "react";
import { chartTheme } from "./chart-theme";
import { wrapLabel, type FigureRow } from "./figures";

export function FrequencyChart({
  rows,
  title,
  color,
  type,
  unit = "Token count",
}: {
  rows: FigureRow[];
  title: string;
  color: string;
  type: string;
  unit?: string;
}) {
  if (!rows.length) return null;
  const vertical = type === "column",
    width = vertical ? Math.max(760, rows.length * 85 + 100) : 800;
  const titleLines = wrapLabel(title, 65),
    top = 54 + titleLines.length * 24;
  const labels = rows.map((row) => wrapLabel(row.label, vertical ? 10 : 24));
  const heights = labels.map((lines) => Math.max(32, lines.length * 17 + 12));
  const height = vertical
    ? top + 330 + Math.max(...labels.map((l) => l.length)) * 16 + 50
    : top + heights.reduce((a, b) => a + b, 0) + 60;
  const max = Math.max(...rows.map((r) => r.value), 1),
    bottom = top + 280;
  let offset = top;
  const format = (n: number) =>
    n >= 1e9 || (n > 0 && n < 0.001)
      ? n.toExponential(3)
      : new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(n);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${title}. ${unit}. ${rows.length} values.`}
      style={{
        width: "100%",
        minWidth: vertical && rows.length > 12 ? 900 : undefined,
        height: "auto",
        display: "block",
      }}
    >
      <title>{title}</title>
      <desc>{`${rows.map((r) => `${r.label}: ${r.value}`).join("; ")}. ${unit}. Zero baseline.`}</desc>
      <rect width={width} height={height} fill="#fff" />
      <g fontFamily="system-ui,sans-serif" fill="#303744">
        {titleLines.map((line, i) => (
          <text key={i} x="28" y={32 + i * 24} fontSize="19" fontWeight="600">
            {line}
          </text>
        ))}
        <text x="28" y={top - 16} fontSize="12" fill="#626c7b">
          {unit} · Corpuscape · zero baseline
        </text>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) =>
          vertical ? (
            <g key={ratio}>
              <line
                x1="65"
                x2={width - 35}
                y1={bottom - ratio * 250}
                y2={bottom - ratio * 250}
                stroke="#e8ebf0"
              />
              <text
                x="58"
                y={bottom - ratio * 250 + 4}
                textAnchor="end"
                fontSize="10"
              >
                {format(max * ratio)}
              </text>
            </g>
          ) : (
            <g key={ratio}>
              <line
                x1={270 + ratio * 400}
                x2={270 + ratio * 400}
                y1={top - 4}
                y2={height - 45}
                stroke="#e8ebf0"
              />
              <text
                x={270 + ratio * 400}
                y={height - 28}
                textAnchor="middle"
                fontSize="10"
              >
                {format(max * ratio)}
              </text>
            </g>
          ),
        )}
        {rows.map((r, i) => {
          const y = offset;
          offset += heights[i];
          const bar = (r.value / max) * 400,
            x = 85 + i * ((width - 130) / rows.length),
            bw = Math.max(8, (width - 130) / rows.length - 22),
            bh = (r.value / max) * 250;
          const rtl = /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(
            r.label.match(/\p{Letter}/u)?.[0] ?? "",
          );
          return (
            <g key={i}>
              <title>{`${r.label}: ${r.value}`}</title>
              {vertical ? (
                <>
                  <rect
                    x={x}
                    y={bottom - bh}
                    width={bw}
                    height={bh}
                    fill={color}
                    rx="3"
                  />
                  <text
                    x={x + bw / 2}
                    y={bottom - bh - 8}
                    textAnchor="middle"
                    fontSize="11"
                  >
                    {format(r.value)}
                  </text>
                  {labels[i].map((line, j) => (
                    <text
                      key={j}
                      x={x + bw / 2}
                      y={bottom + 22 + j * 16}
                      textAnchor="middle"
                      fontSize="11"
                      direction={rtl ? "rtl" : "ltr"}
                    >
                      {line}
                    </text>
                  ))}
                </>
              ) : (
                <>
                  {labels[i].map((line, j) => (
                    <text
                      key={j}
                      x="245"
                      y={y + 15 + j * 17}
                      textAnchor={rtl ? "start" : "end"}
                      fontSize="12"
                      direction={rtl ? "rtl" : "ltr"}
                    >
                      {line}
                    </text>
                  ))}
                  {type === "lollipop" ? (
                    <>
                      <line
                        x1="270"
                        x2={270 + bar}
                        y1={y + 9}
                        y2={y + 9}
                        stroke={color}
                        strokeWidth="2"
                      />
                      <circle cx={270 + bar} cy={y + 9} r="5" fill={color} />
                    </>
                  ) : (
                    <rect
                      x="270"
                      y={y}
                      width={bar}
                      height="18"
                      fill={color}
                      rx="3"
                    />
                  )}
                  <text x={682} y={y + 14} fontSize="12">
                    {format(r.value)}
                  </text>
                </>
              )}
            </g>
          );
        })}
        <text x="28" y={height - 8} fontSize="10" fill="#626c7b">
          Descriptive visualization · underlying values available as CSV
        </text>
      </g>
    </svg>
  );
}

export function CompactFrequencyChart({ rows, title }: { rows: FigureRow[]; title: string }) {
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.map(({ value }) => value));
  return (
    <figure className="frequency-chart" style={{ fontSize: chartTheme.labelSize }}>
      <figcaption style={{ fontSize: chartTheme.titleSize }}>{title} · token count</figcaption>
      <ul>
        {rows.map(({ label, value }) => (
          <li key={label}>
            <bdi>{label}</bdi>
            <span className="frequency-bar" aria-hidden="true">
              <span style={{ width: `${(100 * value) / max}%`, background: chartTheme.brandBlue }} />
            </span>
            <span>{value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
