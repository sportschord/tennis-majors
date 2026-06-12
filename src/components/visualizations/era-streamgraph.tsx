"use client";

import { useMemo, forwardRef } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveBasis } from "d3-shape";
import type { Division } from "@/lib/types";
import { TENNIS_DATA } from "@/lib/data";

const PALETTE = ["#1F6B4A", "#C75B2A", "#1E78B4", "#5D2A6E", "#71A93C", "#D4DD3A", "#9D4321", "#2A4F7A", "#7FC4C0", "#1A6B68"];

// Triangular kernel: centre year counts 3×, neighbours 2×, ±2 years 1×.
// More responsive than the old flat 5-year mean (peaks keep their height,
// single-title seasons register) while curveBasis keeps the streams smooth.
const KERNEL = [1, 2, 3, 2, 1];

interface Props {
  division: Division;
}

export const EraStreamgraph = forwardRef<SVGSVGElement, Props>(function EraStreamgraph({ division }, ref) {
  const W = 1600,
    H = 900;
  const PAD = { l: 60, r: 60, t: 132, b: 122 };

  const { series, stack, years, yMin, yMax } = useMemo(() => {
    const all: { year: number; w: string }[] = [];
    (["AO", "RG", "WB", "US"] as const).forEach((k) => {
      TENNIS_DATA[k][division].forEach((row) => all.push({ year: row.year, w: row.w }));
    });

    const yearMin = 1968;
    const yearMax = Math.max(...all.map((r) => r.year));
    const yrs: number[] = [];
    for (let y = yearMin; y <= yearMax; y++) yrs.push(y);

    const totals: Record<string, number> = {};
    all.forEach((r) => (totals[r.w] = (totals[r.w] || 0) + 1));
    const top = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([n]) => n);

    const ser = top.map((p, i) => {
      const raw = yrs.map((y) => all.filter((r) => r.year === y && r.w === p).length);
      const smooth = raw.map((_, idx) => {
        let s = 0,
          wsum = 0;
        for (let k = -2; k <= 2; k++) {
          const j = idx + k;
          if (j < 0 || j >= raw.length) continue;
          s += raw[j] * KERNEL[k + 2];
          wsum += KERNEL[k + 2];
        }
        return s / wsum;
      });
      return { name: p, color: PALETTE[i % PALETTE.length], values: smooth, total: totals[p] };
    });

    const stk = yrs.map((_, idx) => {
      const total = ser.reduce((s, sr) => s + sr.values[idx], 0);
      let base = -total / 2;
      return ser.map((sr) => {
        const y0 = base;
        base += sr.values[idx];
        return { y0, y1: base };
      });
    });

    const allY = stk.flat().flatMap((l) => [l.y0, l.y1]);
    return {
      series: ser,
      stack: stk,
      years: yrs,
      yMin: Math.min(...allY),
      yMax: Math.max(...allY),
    };
  }, [division]);

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const xScale = scaleLinear()
    .domain([0, years.length - 1])
    .range([PAD.l, PAD.l + innerW]);
  const yScale = scaleLinear()
    .domain([yMin, yMax])
    .range([PAD.t + innerH, PAD.t]);

  const paths = series.map((sr, sIdx) => {
    const areaGen = area<number>()
      .x((_, i) => xScale(i))
      .y0((_, i) => yScale(stack[i][sIdx].y0))
      .y1((_, i) => yScale(stack[i][sIdx].y1))
      .curve(curveBasis);
    return { d: areaGen(years.map((_, i) => i)) || "", color: sr.color, name: sr.name };
  });

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "#FBFAF6", display: "block" }}>
      {/* Poster chrome: centred serif title, tracked subtitle — same type
          system as the champions posters. */}
      <text
        x={W / 2}
        y={66}
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="700"
        fontSize="54"
        fill="#0E1A2B"
        style={{ letterSpacing: "0.02em" }}
      >
        ERA DOMINANCE
      </text>
      <text x={W / 2} y={100} textAnchor="middle" fontFamily="Montserrat" fontWeight="500" fontSize="12.5" fill="#3E4A5E" style={{ letterSpacing: "0.26em" }}>
        {division === "men" ? "MEN'S" : "WOMEN'S"} OPEN ERA · MAJORS WON PER YEAR · WEIGHTED 5-YEAR WINDOW
      </text>

      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity="0.92" />
      ))}

      {years
        .filter((y) => y % 10 === 0)
        .map((y) => {
          const i = y - 1968;
          return (
            <g key={y} transform={`translate(${xScale(i)}, ${H - PAD.b + 14})`}>
              <line y1="-6" y2="0" stroke="#0E1A2B" strokeOpacity="0.35" />
              <text
                textAnchor="middle"
                y="24"
                fontFamily="'Playfair Display', Georgia, serif"
                fontWeight="700"
                fontSize="16"
                fill="#0E1A2B"
                opacity="0.85"
                style={{ letterSpacing: "0.04em" }}
              >
                {y}
              </text>
            </g>
          );
        })}

      {series.map((sr, sIdx) => {
        // Place each label where the stream is VISUALLY thickest: argmax of
        // the 5-index windowed mean (curveBasis renders the local average, so
        // a single-year spike can sit on a visually thin section).
        let best = 0,
          bestI = 0;
        for (let i = 0; i < years.length; i++) {
          let t = 0,
            n = 0;
          for (let k = Math.max(0, i - 2); k <= Math.min(years.length - 1, i + 2); k++) {
            t += stack[k][sIdx].y1 - stack[k][sIdx].y0;
            n++;
          }
          if (t / n > best) {
            best = t / n;
            bestI = i;
          }
        }
        const thicknessPx = Math.abs(yScale(0) - yScale(best));
        if (thicknessPx < 18) return null;
        const fontSize = Math.max(12, Math.min(16, thicknessPx * 0.28));
        // Keep the whole label inside the plot: clamp the anchor away from
        // the edges (streams peaking at the first/last year — e.g. Alcaraz).
        const halfW = (sr.name.length * fontSize * 0.62) / 2 + 12;
        const cx = Math.min(Math.max(xScale(bestI), PAD.l + halfW), W - PAD.r - halfW);
        const li = Math.round(xScale.invert(cx));
        // Average the band over a 3-index window: curveBasis draws the local
        // average of the control points, so this lands on the visual centre.
        let y0s = 0,
          y1s = 0,
          n2 = 0;
        for (let k = Math.max(0, li - 1); k <= Math.min(years.length - 1, li + 1); k++) {
          y0s += stack[k][sIdx].y0;
          y1s += stack[k][sIdx].y1;
          n2++;
        }
        const cy = (yScale(y0s / n2) + yScale(y1s / n2)) / 2;
        return (
          <text
            key={sIdx}
            x={cx}
            y={cy + fontSize * 0.34}
            textAnchor="middle"
            fontFamily="Montserrat"
            fontWeight="700"
            fontSize={fontSize}
            fill="#fff"
            style={{ letterSpacing: "0.08em", paintOrder: "stroke", stroke: "rgba(0,0,0,0.18)", strokeWidth: 2 }}
          >
            {sr.name.toUpperCase()}
          </text>
        );
      })}

      {/* Honour roll, not a chart legend: the streams already carry their
          own labels, so this is a ranking line in plain type. */}
      <text x={W / 2} y={H - 34} textAnchor="middle" fontFamily="Montserrat" fontSize="11.5" fill="#0E1A2B" style={{ letterSpacing: "0.06em" }}>
        {series.map((sr, i) => [
          i > 0 && (
            <tspan key={`s${i}`} fill="#3E4A5E" opacity="0.45">
              {"\u00A0\u00A0\u00B7\u00A0\u00A0"}
            </tspan>
          ),
          <tspan key={`n${i}`} fontWeight="700">
            {sr.name.toUpperCase()}
          </tspan>,
          <tspan key={`t${i}`} fontWeight="500" fill="#3E4A5E">
            {"\u00A0" + sr.total}
          </tspan>,
        ])}
      </text>
    </svg>
  );
});
