"use client";

import { memo } from "react";
import type { Final, TournamentMeta } from "@/lib/types";
import { countPriorTitles, splitScore } from "@/lib/utils";
import { BallCurl, CountBadge, DotRing } from "./indicators";

interface FinalCircleProps {
  row: Final;
  idx: number;
  rows: Final[];
  radius: number;
  tourn: TournamentMeta;
  indicator: "curl" | "badge" | "ring" | "none";
  showNat: boolean;
  showScore: boolean;
  /** Mode-aware nationality color — white on block, deep ink on paper. */
  natFill?: string;
}

export const FinalCircle = memo(function FinalCircle({ row, idx, rows, radius, tourn, indicator, showNat, showScore, natFill = "rgba(255,255,255,0.92)" }: FinalCircleProps) {
  const priorCount = countPriorTitles(rows, idx);
  const isRepeat = priorCount > 0;

  const nameSize = Math.max(9, Math.min(18, radius * 0.3));
  const vsSize = Math.max(7, Math.min(10, radius * 0.18));
  const ruSize = Math.max(8, Math.min(11.5, radius * 0.21));
  const scSize = Math.max(7.5, Math.min(11, radius * 0.2));
  const natSize = Math.max(8, Math.min(10.5, radius * 0.18));

  const chordAt = (y: number) => 2 * Math.sqrt(Math.max(0, radius * radius - y * y));
  const M = Math.max(6, radius * 0.1);

  const nameY = -radius * 0.28;
  const vsY = -radius * 0.04;
  const ruY = radius * 0.16;
  const scY1 = radius * 0.42;
  const scY2 = radius * 0.6;

  const maxNameW = chordAt(nameY) - M * 2;
  const maxRuW = chordAt(ruY) - M * 2;
  const maxScW = chordAt(scY1) - M * 2;
  const charPxApprox = scSize * 0.58;
  const maxScChars = Math.max(7, Math.floor(maxScW / charPxApprox));
  const scoreLines = showScore ? splitScore(row.s, maxScChars) : [];

  return (
    <g>
      {indicator === "curl" && <BallCurl count={priorCount} radius={radius} color={tourn.ball} />}

      <circle r={radius} fill="#fff" />

      {indicator === "ring" && <DotRing count={priorCount + 1} radius={radius} />}
      {indicator === "badge" && isRepeat && <CountBadge count={priorCount} color={tourn.bgDeep} />}

      <text
        textAnchor="middle"
        y={nameY + nameSize * 0.34}
        fontFamily="Montserrat"
        fontWeight="700"
        fontSize={nameSize}
        fill={tourn.bgDeep}
        textLength={maxNameW}
        lengthAdjust="spacingAndGlyphs"
        style={{ letterSpacing: "0.005em" }}
      >
        {row.w}
      </text>

      <text textAnchor="middle" y={vsY + vsSize * 0.34} fontFamily="Montserrat" fontWeight="400" fontSize={vsSize} fill={tourn.bgDeep} opacity="0.55">
        vs
      </text>

      <text
        textAnchor="middle"
        y={ruY + ruSize * 0.34}
        fontFamily="Montserrat"
        fontWeight="500"
        fontSize={ruSize}
        fill={tourn.bgDeep}
        textLength={maxRuW}
        lengthAdjust="spacingAndGlyphs"
        opacity="0.95"
      >
        {row.ru}
      </text>

      {scoreLines.map((line, i) => (
        <text
          key={i}
          textAnchor="middle"
          y={(i === 0 ? scY1 : scY2) + scSize * 0.34}
          fontFamily="Montserrat"
          fontWeight="600"
          fontSize={scSize}
          fill={tourn.bgDeep}
          opacity="0.92"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {line}
        </text>
      ))}

      {showNat && (
        <text
          textAnchor="middle"
          y={radius + natSize * 1.7}
          fontFamily="Montserrat"
          fontWeight="600"
          fontSize={natSize}
          fill={natFill}
          opacity="0.9"
          style={{ letterSpacing: "0.18em" }}
        >
          {row.n}
        </text>
      )}
    </g>
  );
});
