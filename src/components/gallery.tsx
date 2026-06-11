"use client";

import type { TweakState, TournamentKey, Division } from "@/lib/types";
import { TOURNAMENTS, DIVISIONS, TOURNAMENT_ORDER } from "@/lib/tournaments";
import { Poster } from "./poster/poster";

interface GalleryProps {
  tweaks: TweakState;
  onSelect: (tournament: TournamentKey, division: Division) => void;
}

const DIVISION_ORDER: Division[] = ["men", "women"];

/**
 * "The Series" — all 8 posters (4 majors x 2 divisions) on one wall,
 * inheriting the current treatment tweaks. Click any proof to open it.
 */
export function Gallery({ tweaks, onSelect }: GalleryProps) {
  return (
    <div className="w-full max-w-[1380px] mx-auto p-6">
      {DIVISION_ORDER.map((division) => (
        <section key={division} className="mb-10">
          <h2 className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase mb-3">
            {DIVISIONS[division].label}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {TOURNAMENT_ORDER.map((key) => (
              <button
                key={key}
                onClick={() => onSelect(key, division)}
                aria-label={`Open ${TOURNAMENTS[key].name} ${DIVISIONS[division].label} poster`}
                className="interactive-lift group text-left"
              >
                <div
                  className="rounded-sm overflow-hidden transition-shadow group-hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
                  style={{
                    boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 8px 28px rgba(0,0,0,0.45)",
                    outline: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Poster
                    tournamentKey={key}
                    division={division}
                    indicator={tweaks.indicator}
                    showNat={tweaks.showNat}
                    showScore={tweaks.showScore}
                    paperMode={tweaks.paperMode}
                    perRow={tweaks.perRow}
                  />
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: TOURNAMENTS[key].bg }} />
                  <span className="text-[10px] font-semibold tracking-[0.12em] text-white/55 group-hover:text-white/85 transition-colors uppercase">
                    {TOURNAMENTS[key].name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
