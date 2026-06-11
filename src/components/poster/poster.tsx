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
    const natFill = paperMode === "paper" ? tourn.bgDeep : "rgba(255,255,255,0.92)";

    const hoveredRow = hover ? data[hover.idx] : null;
    const hoveredPrior = hover ? countPriorTitles(data, hover.idx) : 0;

    // Court geometry: baselines top/bottom, doubles sidelines at the edge,
    // singles sidelines (the tramlines) inset, plus centre marks. The header
    // rule doubles as the service line, spanning tramline to tramline.
    const court = {
      left: 26,
      right: W - 26,
      tramLeft: 56,
      tramRight: W - 56,
      top: 26,
      bottom: H - FOOT_H - 24,
      serviceY: 60,
      centerMark: 14,
    };
    // Solid chalk-white court lines (real courts aren't subtle): heavy outer
    // boundary, lighter-weight tramlines/service line.
    const lineColor = paperMode === "paper" ? tourn.bg : "#fff";
    const lineOpacity = paperMode === "paper" ? { outer: 0.85, tram: 0.55 } : { outer: 0.92, tram: 0.85 };
    const lineWidth = { outer: 10, tram: 5 };

    // ~0.66em average caps advance for Playfair Display 700 + 0.02em
    // tracking; clamp long titles (Australian Open) inside the court lines.
    const footerTitle = `${tourn.name.toUpperCase()} CHAMPIONS`;
    const footerTitleMaxW = W - 120;
    const footerTitleClamped = footerTitle.length * 84 * 0.66 > footerTitleMaxW;

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

          {/* Tennis-court frame */}
          <g stroke={lineColor} fill="none" strokeLinecap="square">
            {/* baselines */}
            <line x1={court.left} y1={court.top} x2={court.right} y2={court.top} strokeWidth={lineWidth.outer} opacity={lineOpacity.outer} />
            <line x1={court.left} y1={court.bottom} x2={court.right} y2={court.bottom} strokeWidth={lineWidth.outer} opacity={lineOpacity.outer} />
            {/* doubles sidelines */}
            <line x1={court.left} y1={court.top} x2={court.left} y2={court.bottom} strokeWidth={lineWidth.outer} opacity={lineOpacity.outer} />
            <line x1={court.right} y1={court.top} x2={court.right} y2={court.bottom} strokeWidth={lineWidth.outer} opacity={lineOpacity.outer} />
            {/* singles sidelines — the tramlines */}
            <line x1={court.tramLeft} y1={court.top} x2={court.tramLeft} y2={court.bottom} strokeWidth={lineWidth.tram} opacity={lineOpacity.tram} />
            <line x1={court.tramRight} y1={court.top} x2={court.tramRight} y2={court.bottom} strokeWidth={lineWidth.tram} opacity={lineOpacity.tram} />
            {/* centre marks on each baseline */}
            <line x1={W / 2} y1={court.top} x2={W / 2} y2={court.top + 18} strokeWidth={lineWidth.tram} opacity={lineOpacity.outer} />
            <line x1={W / 2} y1={court.bottom} x2={W / 2} y2={court.bottom - 18} strokeWidth={lineWidth.tram} opacity={lineOpacity.outer} />
          </g>

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

          {/* service line, tramline to tramline */}
          <line
            x1={court.tramLeft}
            y1={court.serviceY}
            x2={court.tramRight}
            y2={court.serviceY}
            stroke={lineColor}
            strokeWidth={lineWidth.tram}
            opacity={lineOpacity.tram}
          />

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
                // Anchor the tooltip to the circle on enter (not the cursor):
                // avoids a full poster re-render per mousemove frame.
                onMouseEnter={
                  interactive
                    ? (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHover({ idx: i, x: rect.right, y: rect.top });
                      }
                    : undefined
                }
                onMouseLeave={interactive ? () => setHover(null) : undefined}
                style={interactive ? { cursor: "pointer" } : undefined}
              >
                <FinalCircle row={row} idx={i} rows={data} radius={radius} tourn={tourn} indicator={indicator} showNat={showNat} showScore={showScore} natFill={natFill} />
                {isHovered && (
                  <circle r={radius + 4} fill="none" stroke={paperMode === "paper" ? tourn.bg : "#fff"} strokeOpacity="0.9" strokeWidth="2.5" />
                )}
              </g>
            );
          })}

          {/* Year markers: a fixed right-aligned column between the tramline
              and the circles, vertically centred on each row. */}
          {Array.from({ length: totalRows }, (_, rIdx) => {
            const first = data[rIdx * cols];
            if (!first) return null;
            return (
              <text
                key={first.year}
                x={PAD_X + yearStripW - 18}
                y={gridTop + cellH * (rIdx + 0.5) + 6}
                textAnchor="end"
                fontFamily="'Playfair Display', Georgia, serif"
                fontWeight="700"
                fontSize="17"
                fill={ink}
                style={{ letterSpacing: "0.02em" }}
                opacity="0.95"
              >
                {first.year}
              </text>
            );
          })}

          <rect x="0" y={H - FOOT_H} width={W} height={FOOT_H} fill={tourn.bgDeep} />
          <g transform={`translate(${W / 2}, ${H - FOOT_H + 118})`}>
            <text
              textAnchor="middle"
              fontFamily="'Playfair Display', Georgia, serif"
              fontWeight="700"
              fontSize="84"
              fill="#fff"
              style={{ letterSpacing: "0.02em" }}
              {...(footerTitleClamped ? { textLength: footerTitleMaxW, lengthAdjust: "spacingAndGlyphs" as const } : {})}
            >
              {footerTitle}
            </text>
            <text textAnchor="middle" y="58" fontFamily="Montserrat" fontWeight="500" fontSize="23" fill="rgba(255,255,255,0.9)" style={{ letterSpacing: "0.3em" }}>
              {tourn.venue.toUpperCase()} · {DIVISIONS[division].label.toUpperCase()}
            </text>
          </g>
        </svg>

        {interactive && hover && hoveredRow && (
          <div
            className="poster-tooltip glass-panel rounded-lg px-3.5 py-3"
            style={{
              left: Math.max(8, Math.min(hover.x + 10, window.innerWidth - 296)),
              top: Math.max(8, Math.min(hover.y, window.innerHeight - 160)),
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
