"use client";

import { forwardRef, memo, useState } from "react";
import type { TournamentKey, Division } from "@/lib/types";
import { TENNIS_DATA } from "@/lib/data";
import { TOURNAMENTS, DIVISIONS } from "@/lib/tournaments";
import { countPriorTitles } from "@/lib/utils";
import { TennisBall } from "./indicators";
import { FinalCircle } from "./final-circle";

interface PosterProps {
  tournamentKey: TournamentKey;
  division: Division;
  indicator: "curl" | "badge" | "ring" | "none";
  showNat: boolean;
  showScore: boolean;
  paperMode: "block" | "paper";
  perRow: number;
  /** Enables hover tooltips — off for gallery thumbnails and print capture. */
  interactive?: boolean;
}

interface HoverState {
  idx: number;
  x: number;
  y: number;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}TH`;
  const suffix = ["TH", "ST", "ND", "RD"][n % 10 <= 3 ? n % 10 : 0];
  return `${n}${suffix}`;
}

export const Poster = memo(
  forwardRef<SVGSVGElement, PosterProps>(function Poster(
    { tournamentKey, division, indicator, showNat, showScore, paperMode, perRow, interactive = false },
    ref
  ) {
    const [hover, setHover] = useState<HoverState | null>(null);

    const tourn = TOURNAMENTS[tournamentKey];
    const data = TENNIS_DATA[tournamentKey][division];

    const W = 1188,
      H = 1684;
    const FOOT_H = 230;
    const PAD_X = 70;
    const PAD_TOP = 70;

    const cols = perRow;
    const totalRows = Math.ceil(data.length / cols);
    const gridW = W - PAD_X * 2 - 60;
    const yearStripW = 60;
    const cellW = gridW / cols;
    const gridTop = PAD_TOP;
    const gridBottom = H - FOOT_H - 40;
    const gridH = gridBottom - gridTop;
    const cellH = Math.min(gridH / totalRows, cellW * 1.05);
    const radius = Math.min(cellW, cellH) * 0.38;

    const bg = paperMode === "paper" ? "#FBFAF6" : tourn.bg;
    const ink = paperMode === "paper" ? tourn.bgDeep : "#fff";

    const hoveredRow = hover ? data[hover.idx] : null;
    const hoveredPrior = hover ? countPriorTitles(data, hover.idx) : 0;

    return (
      <div className="relative w-full">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          style={{ display: "block", fontFamily: "Montserrat, system-ui, sans-serif", background: bg }}
        >
          <rect x="0" y="0" width={W} height={H} fill={bg} />

          <rect
            x="22"
            y="22"
            width={W - 44}
            height={H - 44}
            fill="none"
            stroke={paperMode === "paper" ? tourn.bg : "rgba(255,255,255,0.18)"}
            strokeWidth="2"
          />

          <g transform={`translate(${PAD_X + yearStripW}, 44)`}>
            <text fontFamily="Montserrat" fontWeight="700" fontSize="11" fill={ink} opacity="0.85" style={{ letterSpacing: "0.32em" }}>
              OPEN ERA · {data[0].year}–{data[data.length - 1].year} · CHAMPIONS & FINAL SCORES
            </text>
          </g>

          <g transform={`translate(${W - PAD_X}, 50)`}>
            {indicator === "curl" && (
              <g>
                <g transform="translate(-32,0)">
                  <TennisBall size={14} color={tourn.ball} />
                </g>
                <text x="-44" y="3" textAnchor="end" fontFamily="Montserrat" fontWeight="600" fontSize="10" fill={ink} style={{ letterSpacing: "0.18em" }} opacity="0.95">
                  EACH BALL · A PRIOR TITLE
                </text>
              </g>
            )}
            {indicator === "badge" && (
              <text textAnchor="end" fontFamily="Montserrat" fontWeight="600" fontSize="10" fill={ink} style={{ letterSpacing: "0.18em" }} opacity="0.95">
                ×N BADGE · TOTAL TITLES TO DATE
              </text>
            )}
            {indicator === "ring" && (
              <text textAnchor="end" fontFamily="Montserrat" fontWeight="600" fontSize="10" fill={ink} style={{ letterSpacing: "0.18em" }} opacity="0.95">
                INNER DOTS · TOTAL TITLES TO DATE
              </text>
            )}
            {indicator === "none" && (
              <text textAnchor="end" fontFamily="Montserrat" fontWeight="600" fontSize="10" fill={ink} style={{ letterSpacing: "0.18em" }} opacity="0.95">
                FINAL · WINNER vs RUNNER-UP · SCORE
              </text>
            )}
          </g>

          <line x1={PAD_X + yearStripW} y1="60" x2={W - PAD_X} y2="60" stroke={ink} strokeOpacity="0.35" strokeWidth="0.75" />

          {data.map((row, i) => {
            const cIdx = i % cols;
            const rIdx = Math.floor(i / cols);
            const cx = PAD_X + yearStripW + cellW * (cIdx + 0.5);
            const cy = gridTop + cellH * (rIdx + 0.5);
            const isHovered = interactive && hover?.idx === i;
            return (
              <g
                key={i}
                transform={`translate(${cx},${cy})`}
                onMouseEnter={interactive ? (e) => setHover({ idx: i, x: e.clientX, y: e.clientY }) : undefined}
                onMouseMove={interactive ? (e) => setHover({ idx: i, x: e.clientX, y: e.clientY }) : undefined}
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                style={interactive ? { cursor: "pointer" } : undefined}
              >
                <FinalCircle row={row} idx={i} rows={data} radius={radius} tourn={tourn} indicator={indicator} showNat={showNat} showScore={showScore} />
                {isHovered && (
                  <circle r={radius + 4} fill="none" stroke={paperMode === "paper" ? tourn.bg : "#fff"} strokeOpacity="0.9" strokeWidth="2.5" />
                )}
                {cIdx === 0 && (
                  <g transform={`translate(${-radius - 36}, 6)`}>
                    <text fontFamily="Montserrat" fontWeight="800" fontSize="14" fill={ink} style={{ letterSpacing: "0.06em" }} opacity="0.95">
                      {row.year}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          <rect x="0" y={H - FOOT_H} width={W} height={FOOT_H} fill={tourn.bgDeep} />
          <g transform={`translate(${W / 2}, ${H - FOOT_H + 88})`}>
            {(() => {
              const title = `${tourn.name.toUpperCase()} CHAMPIONS`;
              // ~0.72em average advance for Montserrat 800 + 0.06em tracking;
              // clamp long titles (Australian Open) inside the inner border.
              const estWidth = title.length * 78 * 0.72;
              const maxWidth = W - 120;
              return (
                <text
                  textAnchor="middle"
                  fontFamily="Montserrat"
                  fontWeight="800"
                  fontSize="78"
                  fill="#fff"
                  style={{ letterSpacing: "0.06em" }}
                  {...(estWidth > maxWidth ? { textLength: maxWidth, lengthAdjust: "spacingAndGlyphs" as const } : {})}
                >
                  {title}
                </text>
              );
            })()}
            <text textAnchor="middle" y="56" fontFamily="Montserrat" fontWeight="600" fontSize="26" fill="rgba(255,255,255,0.92)" style={{ letterSpacing: "0.22em" }}>
              {tourn.venue.toUpperCase()} · {DIVISIONS[division].label.toUpperCase()}
            </text>
            <text textAnchor="middle" y="98" fontFamily="Montserrat" fontWeight="600" fontSize="12" fill="rgba(255,255,255,0.65)" style={{ letterSpacing: "0.32em" }}>
              SPORTSCHORD · DATA VISUALISATION DESIGN
            </text>
          </g>
        </svg>

        {interactive && hover && hoveredRow && (
          <div
            className="poster-tooltip glass-panel rounded-lg px-3.5 py-3"
            style={{
              left: Math.min(hover.x + 14, (typeof window !== "undefined" ? window.innerWidth : 1200) - 300),
              top: hover.y + 14,
            }}
          >
            <div className="text-[10px] font-bold tracking-[0.2em] text-white/45">
              {hoveredRow.year} · {tourn.name.toUpperCase()}
            </div>
            <div className="mt-1 text-[13px] font-bold text-white leading-snug">{hoveredRow.w}</div>
            <div className="text-[11px] text-white/60 leading-snug">def. {hoveredRow.ru}</div>
            <div className="mt-1.5 text-[11px] font-semibold text-white/85 tabular-nums">{hoveredRow.s}</div>
            <div className="mt-1.5 flex items-center gap-2 text-[9px] font-bold tracking-[0.14em]">
              <span className="text-white/45">{hoveredRow.n}</span>
              <span style={{ color: "var(--accent)" }}>{ordinal(hoveredPrior + 1)} TITLE HERE</span>
            </div>
          </div>
        )}
      </div>
    );
  })
);
