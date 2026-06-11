"use client";

import type { TweakState, VizTab, TournamentKey } from "@/lib/types";
import { TOURNAMENTS, DIVISIONS, TOURNAMENT_ORDER } from "@/lib/tournaments";

interface Props {
  tweaks: TweakState;
  activeViz: VizTab;
  dims: { w: number; h: number };
  onSelectTournament: (key: TournamentKey) => void;
}

const VIZ_LABELS: Record<VizTab, string> = {
  poster: "POSTER",
  gallery: "THE SERIES",
  era: "ERA DOMINANCE",
  career: "CAREER SLAMS",
  fingerprint: "FINGERPRINTS",
  nations: "NATIONS",
};

export function StatusBar({ tweaks, activeViz, dims, onSelectTournament }: Props) {
  const tourn = TOURNAMENTS[tweaks.tournament];
  const isPortrait = dims.h > dims.w;

  const readout = [
    VIZ_LABELS[activeViz],
    activeViz === "gallery" ? "ALL MAJORS" : tourn.venue.toUpperCase(),
    DIVISIONS[tweaks.division].label.toUpperCase(),
    ...(activeViz === "poster" ? [`${tweaks.perRow} PER ROW`] : []),
    isPortrait ? "A1 PORTRAIT" : "LANDSCAPE",
    `${dims.w}×${dims.h}`,
  ].join(" · ");

  return (
    <footer className="status-bar flex items-center justify-between gap-4 px-4 py-1.5 border-t border-white/10 flex-shrink-0">
      <div className="flex items-center gap-3">
        {TOURNAMENT_ORDER.map((key) => {
          const t = TOURNAMENTS[key];
          const active = key === tweaks.tournament;
          return (
            <button
              key={key}
              onClick={() => onSelectTournament(key)}
              aria-label={`Switch to ${t.name}`}
              aria-pressed={active}
              className={`interactive-lift flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.12em] transition-colors ${
                active ? "text-white" : "text-white/35 hover:text-white/60"
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: t.bg, boxShadow: active ? `0 0 6px ${t.bg}` : "none" }}
              />
              {key}
            </button>
          );
        })}
      </div>
      <div className="hidden sm:block text-[9px] font-semibold tracking-[0.14em] text-white/35 truncate">{readout}</div>
    </footer>
  );
}
