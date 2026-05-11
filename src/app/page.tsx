"use client";

import { useState, useRef, useCallback } from "react";
import type { TweakState, VizTab } from "@/lib/types";
import { TOURNAMENTS, DIVISIONS } from "@/lib/tournaments";
import { Sidebar } from "@/components/sidebar";
import { VizSelector } from "@/components/viz-selector";
import { ExportButton } from "@/components/export-button";
import { Poster } from "@/components/poster/poster";
import { EraStreamgraph } from "@/components/visualizations/era-streamgraph";
import { CareerSlamGrid } from "@/components/visualizations/career-slam-grid";
import { ScoreFingerprint } from "@/components/visualizations/score-fingerprint";
import { NationStream } from "@/components/visualizations/nation-stream";

const DEFAULTS: TweakState = {
  tournament: "RG",
  division: "men",
  paperMode: "block",
  indicator: "curl",
  perRow: 6,
  showNat: true,
  showScore: true,
};

export default function Home() {
  const [tweaks, setTweaks] = useState<TweakState>(DEFAULTS);
  const [activeViz, setActiveViz] = useState<VizTab>("poster");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const onTweak = useCallback(<K extends keyof TweakState>(key: K, value: TweakState[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  }, []);

  const tourn = TOURNAMENTS[tweaks.tournament];
  const divLabel = DIVISIONS[tweaks.division].label;

  const filename =
    activeViz === "poster"
      ? `${tourn.name} - ${divLabel}`
      : activeViz === "era"
        ? `Era Dominance - ${divLabel}`
        : activeViz === "career"
          ? `Career Slams - ${divLabel}`
          : activeViz === "fingerprint"
            ? `${tourn.name} - Fingerprints`
            : `Nations - ${divLabel}`;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar tweaks={tweaks} onTweak={onTweak} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="top-bar flex items-center gap-3 px-4 py-2 border-b border-white/10 flex-shrink-0 flex-wrap">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/60 hover:text-white text-sm">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="4" width="16" height="2" rx="1" />
              <rect x="2" y="9" width="16" height="2" rx="1" />
              <rect x="2" y="14" width="16" height="2" rx="1" />
            </svg>
          </button>

          <div className="flex items-center gap-2 mr-auto">
            <span className="text-[10px] font-bold tracking-[0.3em] text-[#7FC4C0] uppercase">Sportschord</span>
            <span className="text-white/20">·</span>
            <span className="text-[11px] font-semibold text-white/70 tracking-wide">Tennis Series</span>
          </div>

          <VizSelector active={activeViz} onChange={setActiveViz} />
          <ExportButton svgRef={svgRef} filename={filename} />
        </header>

        <div className="viz-area flex-1 overflow-auto flex items-start justify-center p-6">
          <div
            className="w-full"
            style={{
              maxWidth:
                activeViz === "poster" || activeViz === "career" || activeViz === "fingerprint" ? "min(600px, 100%)" : "min(1000px, 100%)",
            }}
          >
            {activeViz === "poster" && (
              <Poster
                ref={svgRef}
                tournamentKey={tweaks.tournament}
                division={tweaks.division}
                indicator={tweaks.indicator}
                showNat={tweaks.showNat}
                showScore={tweaks.showScore}
                paperMode={tweaks.paperMode}
                perRow={tweaks.perRow}
              />
            )}
            {activeViz === "era" && <EraStreamgraph ref={svgRef} division={tweaks.division} />}
            {activeViz === "career" && <CareerSlamGrid ref={svgRef} division={tweaks.division} />}
            {activeViz === "fingerprint" && <ScoreFingerprint ref={svgRef} tournamentKey={tweaks.tournament} division={tweaks.division} />}
            {activeViz === "nations" && <NationStream ref={svgRef} division={tweaks.division} />}
          </div>
        </div>
      </main>
    </div>
  );
}
