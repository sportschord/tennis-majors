"use client";

import { useMemo, forwardRef } from "react";
import type { Division, TournamentKey } from "@/lib/types";
import { TENNIS_DATA } from "@/lib/data";

const TOURN_KEYS: TournamentKey[] = ["AO", "RG", "WB", "US"];
const COLORS: Record<TournamentKey, string> = { AO: "#1E78B4", RG: "#C75B2A", WB: "#1F6B4A", US: "#3F6FA4" };

interface Props {
  division: Division;
}

export const CareerSlamGrid = forwardRef<SVGSVGElement, Props>(function CareerSlamGrid({ division }, ref) {
  const W = 1188,
    H = 1684;

  const players = useMemo(() => {
    const m: Record<string, Record<TournamentKey, number[]>> = {};
    TOURN_KEYS.forEach((k) => {
      TENNIS_DATA[k][division].forEach((r) => {
        if (!m[r.w]) m[r.w] = { AO: [], RG: [], WB: [], US: [] };
        m[r.w][k].push(r.year);
      });
    });
    return Object.entries(m)
      .map(([name, totals]) => ({
        name,
        totals,
        total: totals.AO.length + totals.RG.length + totals.WB.length + totals.US.length,
      }))
      .filter((p) => p.total >= 3)
      .sort((a, b) => b.total - a.total);
  }, [division]);

  const PAD = { l: 70, r: 70, t: 110, b: 200 };
  const rowH = (H - PAD.t - PAD.b) / players.length;
  const nameW = 240;
  const totalW = 80;
  const tournW = (W - PAD.l - PAD.r - nameW - totalW) / 4;
  const cellPad = 8;

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ background: "#FBFAF6", display: "block", fontFamily: "Montserrat" }}>
      <text x={W / 2} y={56} textAnchor="middle" fontFamily="Montserrat" fontWeight="800" fontSize="42" fill="#0E1A2B" style={{ letterSpacing: "0.06em" }}>
        CAREER SLAMS · {division === "men" ? "MEN'S" : "WOMEN'S"} OPEN ERA
      </text>
      <text x={W / 2} y={82} textAnchor="middle" fontFamily="Montserrat" fontWeight="500" fontSize="13" fill="#3E4A5E" style={{ letterSpacing: "0.22em" }}>
        EVERY MAJOR-FINAL VICTORY BY PLAYER · 1968–2025
      </text>

      <g transform={`translate(0, ${PAD.t - 22})`}>
        <text x={PAD.l} fontFamily="Montserrat" fontWeight="700" fontSize="11" fill="#0E1A2B" style={{ letterSpacing: "0.22em" }} opacity="0.6">
          PLAYER
        </text>
        {TOURN_KEYS.map((k, i) => (
          <g key={k} transform={`translate(${PAD.l + nameW + tournW * i + tournW / 2}, 0)`}>
            <text textAnchor="middle" fontFamily="Montserrat" fontWeight="800" fontSize="14" fill={COLORS[k]} style={{ letterSpacing: "0.22em" }}>
              {k}
            </text>
          </g>
        ))}
        <text x={W - PAD.r} textAnchor="end" fontFamily="Montserrat" fontWeight="700" fontSize="11" fill="#0E1A2B" style={{ letterSpacing: "0.22em" }} opacity="0.6">
          TOTAL
        </text>
      </g>

      {players.map((p, idx) => {
        const y = PAD.t + rowH * idx;
        return (
          <g key={p.name} transform={`translate(0, ${y})`}>
            {idx % 2 === 0 && <rect x={PAD.l - 12} y="0" width={W - PAD.l - PAD.r + 24} height={rowH} fill="#0E1A2B" opacity="0.025" />}
            <text x={PAD.l} y={rowH / 2 + 4} fontFamily="Montserrat" fontWeight="700" fontSize="16" fill="#0E1A2B">
              {p.name}
            </text>

            {TOURN_KEYS.map((k, i) => {
              const wins = p.totals[k];
              const cx0 = PAD.l + nameW + tournW * i + cellPad;
              const cellWidth = tournW - cellPad * 2;
              const dotR = Math.min(rowH / 2 - 6, 11);
              const maxDots = Math.floor(cellWidth / (dotR * 2 + 4));
              const visible = Math.min(wins.length, maxDots);
              return (
                <g key={k}>
                  {wins.slice(0, visible).map((yr, di) => (
                    <g key={di} transform={`translate(${cx0 + (dotR + 2) + di * (dotR * 2 + 4)}, ${rowH / 2})`}>
                      <circle r={dotR} fill={COLORS[k]} />
                      <text textAnchor="middle" y="3.5" fontFamily="Montserrat" fontWeight="700" fontSize="8.5" fill="#fff">
                        {String(yr).slice(2)}
                      </text>
                    </g>
                  ))}
                  {wins.length > visible && (
                    <text x={cx0 + (dotR + 2) + visible * (dotR * 2 + 4)} y={rowH / 2 + 3} fontFamily="Montserrat" fontWeight="700" fontSize="11" fill={COLORS[k]}>
                      +{wins.length - visible}
                    </text>
                  )}
                </g>
              );
            })}

            <text x={W - PAD.r} y={rowH / 2 + 6} textAnchor="end" fontFamily="Montserrat" fontWeight="800" fontSize="22" fill="#0E1A2B">
              {p.total}
            </text>
          </g>
        );
      })}

      <text x={W / 2} y={H - 80} textAnchor="middle" fontFamily="Montserrat" fontWeight="600" fontSize="14" fill="#3E4A5E" style={{ letterSpacing: "0.22em" }}>
        SPORTSCHORD · DATA VISUALISATION DESIGN
      </text>
    </svg>
  );
});
