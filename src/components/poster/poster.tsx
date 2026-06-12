"use client";

import { forwardRef, memo, useState } from "react";
import type { TournamentKey, Division } from "@/lib/types";
import { TENNIS_DATA } from "@/lib/data";
import { TOURNAMENTS, DIVISIONS } from "@/lib/tournaments";
import { countPriorTitles } from "@/lib/utils";
import { BallSheenDefs, TennisBall } from "./indicators";
import { FinalCircle } from "./final-circle";

interface PosterProps {
  tournamentKey: TournamentKey;
  division: Division;
  indicator: "curl" | "badge" | "ring" | "none";
  ballPlacement?: "overlap" | "float";
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

// Measured Playfair Display 700 advance widths at 84px + 0.02em tracking.
const TITLE_NATURAL_W: Record<string, number> = {
  "AUSTRALIAN OPEN CHAMPIONS": 1362,
  "FRENCH OPEN CHAMPIONS": 1174,
  "WIMBLEDON CHAMPIONS": 1113,
  "US OPEN CHAMPIONS": 926,
};

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}TH`;
  const suffix = ["TH", "ST", "ND", "RD"][n % 10 <= 3 ? n % 10 : 0];
  return `${n}${suffix}`;
}

export const Poster = memo(
  forwardRef<SVGSVGElement, PosterProps>(function Poster(
    { tournamentKey, division, indicator, ballPlacement = "overlap", showNat, showScore, paperMode, perRow, interactive = false },
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

    // Court-as-frame: the white surround IS the court line. A solid margin
    // wraps the colour field, and a same-width gap separates the footer band
    // — boundary and baseline drawn in negative space, not stroked on top.
    const FRAME = 28;
    const footerTop = H - FRAME - FOOT_H;
    const fieldBottom = footerTop - FRAME;

    const cols = perRow;
    const totalRows = Math.ceil(data.length / cols);
    const gridW = W - PAD_X * 2 - 60;
    const yearStripW = 60;
    const cellW = gridW / cols;
    const gridTop = PAD_TOP;
    const gridBottom = fieldBottom - 34;
    const gridH = gridBottom - gridTop;
    const cellH = Math.min(gridH / totalRows, cellW * 1.05);
    const radius = Math.min(cellW, cellH) * 0.38;

    const bg = paperMode === "paper" ? "#FBFAF6" : tourn.bg;
    const ink = paperMode === "paper" ? tourn.bgDeep : "#fff";
    const natFill = paperMode === "paper" ? tourn.bgDeep : "rgba(255,255,255,0.92)";

    const hoveredRow = hover ? data[hover.idx] : null;
    const hoveredPrior = hover ? countPriorTitles(data, hover.idx) : 0;

    // Fit-to-width beats textLength compression (squeezed glyphs distort the
    // serif): long titles scale down to TITLE_W, short ones letter-space out
    // to it, so all four posters carry an identical title width with even
    // margins. Widths measured via getComputedTextLength at 84px Playfair
    // Display 700 with 0.02em tracking (self-hosted font, metrics stable).
    const TITLE_W = 1000;
    const footerTitle = `${tourn.name.toUpperCase()} CHAMPIONS`;
    const titleNaturalW = TITLE_NATURAL_W[footerTitle] ?? footerTitle.length * 84 * 0.7;
    const footerTitleSize = Math.min(84, (84 * TITLE_W) / titleNaturalW);

    return (
      <div className="relative w-full">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          style={{ display: "block", fontFamily: "Montserrat, system-ui, sans-serif", background: "#fff" }}
        >
          <BallSheenDefs />
          <rect x="0" y="0" width={W} height={H} fill="#fff" />

          {/* Colour field inside the white court frame */}
          <rect x={FRAME} y={FRAME} width={W - FRAME * 2} height={fieldBottom - FRAME} fill={bg} />
          {paperMode === "paper" && (
            <rect
              x={FRAME}
              y={FRAME}
              width={W - FRAME * 2}
              height={fieldBottom - FRAME}
              fill="none"
              stroke={tourn.bg}
              strokeOpacity="0.5"
              strokeWidth="2"
            />
          )}

          <g transform={`translate(${PAD_X + yearStripW}, 58)`}>
            <text fontFamily="Montserrat" fontWeight="600" fontSize="11" fill={ink} opacity="0.85" style={{ letterSpacing: "0.32em" }}>
              OPEN ERA · {data[0].year}–{data[data.length - 1].year} · CHAMPIONS & FINAL SCORES
            </text>
          </g>

          {/* Legend shares the header's baseline (58); the ball icon is
              optically centred on the cap height of the 10px text. */}
          <g transform={`translate(${W - PAD_X}, 58)`}>
            {indicator === "curl" && (
              <g>
                <g transform="translate(-34,-10)">
                  <TennisBall size={14} color={tourn.ball} />
                </g>
                <text x="-44" textAnchor="end" fontFamily="Montserrat" fontWeight="600" fontSize="10" fill={ink} style={{ letterSpacing: "0.18em" }} opacity="0.95">
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
                <FinalCircle row={row} idx={i} rows={data} radius={radius} tourn={tourn} indicator={indicator} ballPlacement={ballPlacement} showNat={showNat} showScore={showScore} natFill={natFill} />
                {isHovered && (
                  <circle r={radius + 4} fill="none" stroke={paperMode === "paper" ? tourn.bg : "#fff"} strokeOpacity="0.9" strokeWidth="2.5" />
                )}
              </g>
            );
          })}

          {/* Year markers: a fixed right-aligned column between the frame
              and the circles, vertically centred on each row. */}
          {Array.from({ length: totalRows }, (_, rIdx) => {
            const first = data[rIdx * cols];
            if (!first) return null;
            return (
              <text
                key={first.year}
                x={PAD_X + yearStripW - 18}
                y={gridTop + cellH * (rIdx + 0.5) + 5}
                textAnchor="end"
                fontFamily="Montserrat"
                fontWeight="600"
                fontSize="15"
                fill={ink}
                style={{ letterSpacing: "0.12em", fontVariantNumeric: "tabular-nums" }}
                opacity="0.9"
              >
                {first.year}
              </text>
            );
          })}

          <rect x={FRAME} y={footerTop} width={W - FRAME * 2} height={FOOT_H} fill={tourn.bgDeep} />
          <g transform={`translate(${W / 2}, ${footerTop + 118})`}>
            <text
              textAnchor="middle"
              fontFamily="'Playfair Display', Georgia, serif"
              fontWeight="700"
              fontSize={footerTitleSize}
              fill="#fff"
              style={{ letterSpacing: "0.02em" }}
              textLength={TITLE_W}
              lengthAdjust="spacing"
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
