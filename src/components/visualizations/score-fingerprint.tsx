"use client";

import { forwardRef } from "react";
import type { TournamentKey, Division } from "@/lib/types";
import { TENNIS_DATA } from "@/lib/data";
import { TOURNAMENTS } from "@/lib/tournaments";
import { parseSets } from "@/lib/utils";

interface Props {
  tournamentKey: TournamentKey;
  division: Division;
}

export const ScoreFingerprint = forwardRef<SVGSVGElement, Props>(function ScoreFingerprint({ tournamentKey, division }, ref) {
  const W = 1188,
    H = 1684;
  const cx = W / 2,
    cy = 800;
  const data = TENNIS_DATA[tournamentKey][division];
  const tourn = TOURNAMENTS[tournamentKey];
  const N = data.length;
  const innerR = 120;
  const ringStep = 36;
  const maxSets = 5;

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: tourn.bg, display: "block", fontFamily: "Montserrat" }}>
      <rect x="0" y="0" width={W} height={H} fill={tourn.bg} />
      <text x={W / 2} y={70} textAnchor="middle" fontFamily="Montserrat" fontWeight="800" fontSize="42" fill="#fff" style={{ letterSpacing: "0.06em" }}>
        {tourn.name.toUpperCase()} · FINAL FINGERPRINTS
      </text>
      <text x={W / 2} y={100} textAnchor="middle" fontFamily="Montserrat" fontWeight="500" fontSize="14" fill="rgba(255,255,255,0.85)" style={{ letterSpacing: "0.22em" }}>
        {division === "men" ? "MEN'S" : "WOMEN'S"} · EVERY FINAL · {data[0].year}–{data[N - 1].year} · BAR LENGTH ∝ GAMES IN SET
      </text>

      {[1, 2, 3, 4, 5].map((s) => (
        <circle key={s} cx={cx} cy={cy} r={innerR + ringStep * s} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
      ))}

      {data.map((row, i) => {
        const angle = ((-90 + (360 / N) * i) * Math.PI) / 180;
        const sets = parseSets(row.s);
        return (
          <g key={i}>
            {sets.map((set, si) => {
              const rA = innerR + ringStep * si + 4;
              const rB = innerR + ringStep * (si + 1) - 4;
              const winFrac = set.w / Math.max(1, set.total);
              const split = rA + (rB - rA) * winFrac;
              const x1 = cx + Math.cos(angle) * rA;
              const y1 = cy + Math.sin(angle) * rA;
              const xS = cx + Math.cos(angle) * split;
              const yS = cy + Math.sin(angle) * split;
              const x2 = cx + Math.cos(angle) * rB;
              const y2 = cy + Math.sin(angle) * rB;
              return (
                <g key={si}>
                  <line x1={x1} y1={y1} x2={xS} y2={yS} stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  <line x1={xS} y1={yS} x2={x2} y2={y2} stroke="rgba(255,255,255,0.32)" strokeWidth="3" strokeLinecap="round" />
                </g>
              );
            })}
            {row.year % 5 === 0 && (() => {
              const r = innerR + ringStep * maxSets + 22;
              const x = cx + Math.cos(angle) * r;
              const y = cy + Math.sin(angle) * r;
              return (
                <text x={x} y={y} textAnchor="middle" fontFamily="Montserrat" fontWeight="700" fontSize="10" fill="rgba(255,255,255,0.85)" style={{ letterSpacing: "0.12em" }}>
                  {row.year}
                </text>
              );
            })()}
          </g>
        );
      })}

      <g transform={`translate(${W / 2}, ${cy + innerR + ringStep * maxSets + 80})`}>
        <text textAnchor="middle" fontFamily="Montserrat" fontWeight="700" fontSize="13" fill="#fff" style={{ letterSpacing: "0.18em" }}>
          {"INNER RING · SET 1     →     OUTER RING · SET 5"}
        </text>
        <text textAnchor="middle" y="22" fontFamily="Montserrat" fontWeight="500" fontSize="11" fill="rgba(255,255,255,0.7)" style={{ letterSpacing: "0.18em" }}>
          {"WHITE = CHAMPION'S GAMES   ·   FADED = RUNNER-UP'S GAMES"}
        </text>
      </g>

    </svg>
  );
});
