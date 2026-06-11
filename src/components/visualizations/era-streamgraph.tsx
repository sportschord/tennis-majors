"use client";

import { useMemo, forwardRef } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveBasis } from "d3-shape";
import type { Division } from "@/lib/types";
import { TENNIS_DATA } from "@/lib/data";

const PALETTE = ["#1F6B4A", "#C75B2A", "#1E78B4", "#5D2A6E", "#71A93C", "#D4DD3A", "#9D4321", "#2A4F7A", "#7FC4C0", "#1A6B68"];

interface Props {
  division: Division;
}

export const EraStreamgraph = forwardRef<SVGSVGElement, Props>(function EraStreamgraph({ division }, ref) {
  const W = 1600,
    H = 900;
  const PAD = { l: 70, r: 40, t: 90, b: 90 };

  const { series, stack, years, yMin, yMax } = useMemo(() => {
    const all: { year: number; w: string }[] = [];
    (["AO", "RG", "WB", "US"] as const).forEach((k) => {
      TENNIS_DATA[k][division].forEach((row) => all.push({ year: row.year, w: row.w }));
    });

    const yearMin = 1968,
      yearMax = 2025;
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
          n = 0;
        for (let k = Math.max(0, idx - 2); k <= Math.min(raw.length - 1, idx + 2); k++) {
          s += raw[k];
          n++;
        }
        return s / n;
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
      <text x={PAD.l} y={50} fontFamily="Montserrat" fontWeight="800" fontSize="34" fill="#0E1A2B" style={{ letterSpacing: "0.04em" }}>
        ERA DOMINANCE — {division === "men" ? "MEN'S" : "WOMEN'S"} OPEN ERA
      </text>
      <text x={PAD.l} y={74} fontFamily="Montserrat" fontWeight="500" fontSize="12" fill="#3E4A5E" style={{ letterSpacing: "0.22em" }}>
        MAJORS WON PER YEAR · 5-YEAR ROLLING MEAN · TOP 10 OPEN-ERA CHAMPIONS
      </text>

      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + innerH / 2} y2={PAD.t + innerH / 2} stroke="#D8DCE3" />

      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity="0.92" />
      ))}

      {years
        .filter((y) => y % 10 === 0)
        .map((y) => {
          const i = y - 1968;
          return (
            <g key={y} transform={`translate(${xScale(i)}, ${H - PAD.b + 8})`}>
              <line y1="-4" y2="0" stroke="#0E1A2B" strokeOpacity="0.4" />
              <text textAnchor="middle" y="22" fontFamily="Montserrat" fontWeight="700" fontSize="12" fill="#0E1A2B" style={{ letterSpacing: "0.12em" }}>
                {y}
              </text>
            </g>
          );
        })}

      {series.map((sr, sIdx) => {
        let peak = 0,
          peakI = 0;
        for (let i = 0; i < years.length; i++) {
          const t = stack[i][sIdx].y1 - stack[i][sIdx].y0;
          if (t > peak) {
            peak = t;
            peakI = i;
          }
        }
        if (peak < 0.15) return null;
        const cx = xScale(peakI);
        const cy = (yScale(stack[peakI][sIdx].y0) + yScale(stack[peakI][sIdx].y1)) / 2;
        return (
          <text
            key={sIdx}
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fontFamily="Montserrat"
            fontWeight="700"
            fontSize="13"
            fill="#fff"
            style={{ letterSpacing: "0.06em", paintOrder: "stroke", stroke: "rgba(0,0,0,0.18)", strokeWidth: 2 }}
          >
            {sr.name.toUpperCase()}
          </text>
        );
      })}

      {[1, 2, 3, 4].map((v) => {
        const yTop = yScale(v);
        if (yTop < PAD.t + 6) return null;
        return (
          <g key={v}>
            <line x1={PAD.l - 6} x2={PAD.l} y1={yTop} y2={yTop} stroke="#0E1A2B" strokeOpacity="0.3" />
            <text x={PAD.l - 10} y={yTop + 4} textAnchor="end" fontFamily="Montserrat" fontWeight="600" fontSize="10" fill="#3E4A5E" style={{ letterSpacing: "0.08em" }}>
              {v}
            </text>
          </g>
        );
      })}
      <text x={PAD.l - 10} y={PAD.t + innerH / 2 + 4} textAnchor="end" fontFamily="Montserrat" fontWeight="700" fontSize="10" fill="#3E4A5E" style={{ letterSpacing: "0.12em" }}>
        0
      </text>
      <text
        transform={`translate(${PAD.l - 44}, ${PAD.t + innerH / 2}) rotate(-90)`}
        textAnchor="middle"
        fontFamily="Montserrat"
        fontWeight="700"
        fontSize="11"
        fill="#3E4A5E"
        style={{ letterSpacing: "0.22em" }}
      >
        SLAMS / YR (BOTH SIDES)
      </text>

      <g transform={`translate(${PAD.l}, ${H - PAD.b + 44})`}>
        {series.map((sr, i) => (
          <g key={i} transform={`translate(${(i % 5) * 290}, ${Math.floor(i / 5) * 22})`}>
            <rect width="14" height="14" rx="2" fill={sr.color} />
            <text x="20" y="11" fontFamily="Montserrat" fontWeight="700" fontSize="11" fill="#0E1A2B" style={{ letterSpacing: "0.06em" }}>
              {sr.name.toUpperCase()}
            </text>
            <text
              x="20"
              y="11"
              dx={sr.name.length * 7 + 8}
              fontFamily="Montserrat"
              fontWeight="500"
              fontSize="11"
              fill="#3E4A5E"
              style={{ letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}
            >
              · {sr.total} TITLES
            </text>
          </g>
        ))}
      </g>

    </svg>
  );
});
