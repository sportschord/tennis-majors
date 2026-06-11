"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { TweakState, VizTab, TournamentKey, Division } from "@/lib/types";
import { TOURNAMENTS, DIVISIONS } from "@/lib/tournaments";
import { DEFAULT_TWEAKS, DEFAULT_VIZ, decodeState, encodeState } from "@/lib/url-state";
import { Sidebar } from "@/components/sidebar";
import { VizSelector } from "@/components/viz-selector";
import { ExportButton } from "@/components/export-button";
import { Artboard } from "@/components/artboard";
import { StatusBar } from "@/components/status-bar";
import { Gallery } from "@/components/gallery";
import { Poster } from "@/components/poster/poster";
import { EraStreamgraph } from "@/components/visualizations/era-streamgraph";
import { CareerSlamGrid } from "@/components/visualizations/career-slam-grid";
import { ScoreFingerprint } from "@/components/visualizations/score-fingerprint";
import { NationStream } from "@/components/visualizations/nation-stream";

const VIZ_DIMS: Record<Exclude<VizTab, "gallery">, { w: number; h: number }> = {
  poster: { w: 1188, h: 1684 },
  era: { w: 1600, h: 900 },
  career: { w: 1188, h: 1684 },
  fingerprint: { w: 1188, h: 1684 },
  nations: { w: 1600, h: 900 },
};

export default function Home() {
  const [tweaks, setTweaks] = useState<TweakState>(DEFAULT_TWEAKS);
  const [activeViz, setActiveViz] = useState<VizTab>(DEFAULT_VIZ);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Restore state from the URL once on mount, then keep the URL in sync so
  // any configuration is shareable / bookmarkable (and capturable by the
  // upcoming /print pipeline).
  useEffect(() => {
    const { tweaks: t, viz } = decodeState(window.location.search);
    setTweaks(t);
    setActiveViz(viz);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.history.replaceState(null, "", `${window.location.pathname}?${encodeState(tweaks, activeViz)}`);
  }, [hydrated, tweaks, activeViz]);

  const onTweak = useCallback(<K extends keyof TweakState>(key: K, value: TweakState[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  }, []);

  const openFromGallery = useCallback((tournament: TournamentKey, division: Division) => {
    setTweaks((prev) => ({ ...prev, tournament, division }));
    setActiveViz("poster");
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to surface.
    }
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

  const dims = activeViz === "gallery" ? VIZ_DIMS.poster : VIZ_DIMS[activeViz];

  return (
    <div className="flex h-screen overflow-hidden" style={{ "--accent": tourn.bg } as React.CSSProperties}>
      <Sidebar tweaks={tweaks} onTweak={onTweak} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="top-bar flex items-center gap-3 px-4 py-2 border-b border-white/10 flex-shrink-0 flex-wrap">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open tweaks panel"
            className="lg:hidden text-white/60 hover:text-white text-sm"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <rect x="2" y="4" width="16" height="2" rx="1" />
              <rect x="2" y="9" width="16" height="2" rx="1" />
              <rect x="2" y="14" width="16" height="2" rx="1" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5 mr-auto">
            <Image src="/sportschord-mark.svg" alt="SportsChord" width={24} height={24} priority />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] font-bold tracking-[0.3em] text-brand uppercase">Sportschord · Tennis</span>
              <span className="text-[12px] font-semibold text-white/85 tracking-wide">Majors Print Series</span>
            </div>
          </div>

          <VizSelector active={activeViz} onChange={setActiveViz} />

          <button
            onClick={copyLink}
            className="interactive-lift px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>

          <ExportButton svgRef={svgRef} filename={filename} />
        </header>

        {activeViz === "gallery" ? (
          <div className="viz-area flex-1 overflow-auto">
            <Gallery tweaks={tweaks} onSelect={openFromGallery} />
          </div>
        ) : (
          <div className="viz-area flex-1 min-h-0 flex flex-col">
            <Artboard
              width={dims.w}
              height={dims.h}
              artworkKey={`${activeViz}-${tweaks.tournament}-${tweaks.division}-${tweaks.paperMode}`}
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
                  interactive
                />
              )}
              {activeViz === "era" && <EraStreamgraph ref={svgRef} division={tweaks.division} />}
              {activeViz === "career" && <CareerSlamGrid ref={svgRef} division={tweaks.division} />}
              {activeViz === "fingerprint" && (
                <ScoreFingerprint ref={svgRef} tournamentKey={tweaks.tournament} division={tweaks.division} />
              )}
              {activeViz === "nations" && <NationStream ref={svgRef} division={tweaks.division} />}
            </Artboard>
          </div>
        )}

        <StatusBar
          tweaks={tweaks}
          activeViz={activeViz}
          dims={dims}
          onSelectTournament={(key) => onTweak("tournament", key)}
        />
      </main>
    </div>
  );
}
