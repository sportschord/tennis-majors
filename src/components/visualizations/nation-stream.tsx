"use client";

import { useMemo, forwardRef } from "react";
import { scaleLinear } from "d3-scale";
import { area, curveBasis } from "d3-shape";
import type { Division } from "@/lib/types";
import { TENNIS_DATA } from "@/lib/data";

const PALETTE = ["#1E78B4", "#C75B2A", "#1F6B4A", "#5D2A6E", "#71A93C", "#D4DD3A", "#9D4321", "#2A4F7A", "#7FC4C0", "#1A6B68"];

interface Props {
  division: Division;
}

export const NationStream = forwardRef<SVGSVGElement, Props>(function NationStream({ division }, ref) {
  const W = 1600,
    H = 900;
  const PAD = { l: 70, r: 220, t: 90, b: 90 };

  const { series, stack, years, maxStack, totals } = useMemo(() => {
    const all: { year: number; n: string }[] = [];
    (["AO", "RG", "WB", "US"] as const).forEach((k) => {
      TENNIS_DATA[k][division].forEach((r) => all.push({ year: r.year, n: r.n }));
    });

    const yearMin = 1968,
      yearMax = 2025;
    const yrs: number[] = [];
    for (let y = yearMin; y <= yearMax; y++) yrs.push(y);

    const tots: Record<string, number> = {};
    all.forEach((r) => (tots[r.n] = (tots[r.n] || 0) + 1));
    const top = Object.entries(tots)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([n]) => n);

    const ser = top.map((n, i) => {
      const raw = yrs.map((y) => all.filter((r) => r.year === y && r.n === n).length);
      const smooth = raw.map((_, idx) => {
        let s = 0,
          cnt = 0;
        for (let k = Math.max(0, idx - 2); k <= Math.min(raw.length - 1, idx + 2); k++) {
          s += raw[k];
          cnt++;
        }
        return s / cnt;
      });
      return { name: n, color: PALETTE[i % PALETTE.length], values: smooth };
    });

    const stk = yrs.map((_, idx) => {
      let base = 0;
      return ser.map((sr) => {
        const y0 = base;
        base += sr.values[idx];
        return { y0, y1: base };
      });
    });

    const ms = Math.max(...stk.map((layers) => layers[layers.length - 1].y1));
    return { series: ser, stack: stk, years: yrs, maxStack: ms, totals: tots };
  }, [division]);

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const xScale = scaleLinear()
    .domain([0, years.length - 1])
    .range([PAD.l, PAD.l + innerW]);
  const yScale = scaleLinear()
    .domain([0, maxStack])
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
        TITLES BY NATION — {division === "men" ? "MEN'S" : "WOMEN'S"} OPEN ERA
      </text>
      <text x={PAD.l} y={74} fontFamily="Montserrat" fontWeight="500" fontSize="12" fill="#3E4A5E" style={{ letterSpacing: "0.22em" }}>
        5-YEAR ROLLING TOTAL · ALL FOUR MAJORS COMBINED
      </text>

      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity="0.92" />
      ))}

      {series.map((sr, i) => (
        <g key={i} transform={`translate(${W - PAD.r + 24}, ${PAD.t + 8 + i * 30})`}>
          <rect width="18" height="14" fill={sr.color} />
          <text x="26" y="12" fontFamily="Montserrat" fontWeight="700" fontSize="13" fill="#0E1A2B" style={{ letterSpacing: "0.12em" }}>
            {sr.name}
          </text>
          <text x="120" y="12" fontFamily="Montserrat" fontWeight="500" fontSize="12" fill="#3E4A5E">
            {totals[sr.name]}
          </text>
        </g>
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

      <text x={W - 40} y={H - 24} textAnchor="end" fontFamily="Montserrat" fontWeight="600" fontSize="11" fill="#3E4A5E" style={{ letterSpacing: "0.22em" }}>
        SPORTSCHORD · DATA VISUALISATION DESIGN
      </text>
    </svg>
  );
});
