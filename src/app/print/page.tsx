"use client";

import { useEffect, useState } from "react";
import type { TweakState, VizTab } from "@/lib/types";
import { decodeState } from "@/lib/url-state";
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

/**
 * Chrome-free render target for headless capture (mirrors f1app's
 * renderOnPage contract): /print?viz=poster&tourn=WB&div=women&...
 * Puppeteer waits for #print-page[data-ready="true"] — set only after
 * fonts have loaded — then screenshots the element at deviceScaleFactor
 * sized for the requested DPI.
 */
export default function PrintPage() {
  const [state, setState] = useState<{ tweaks: TweakState; viz: Exclude<VizTab, "gallery"> } | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    const { tweaks, viz } = decodeState(window.location.search);
    // The gallery is a browsing view, not a print artifact.
    setState({ tweaks, viz: viz === "gallery" ? "poster" : viz });
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  const { tweaks, viz } = state;
  const dims = VIZ_DIMS[viz];

  return (
    <div
      id="print-page"
      data-ready={fontsReady ? "true" : "false"}
      data-viz={viz}
      data-tournament={tweaks.tournament}
      data-division={tweaks.division}
      style={{ width: dims.w, height: dims.h }}
    >
      {viz === "poster" && (
        <Poster
          tournamentKey={tweaks.tournament}
          division={tweaks.division}
          indicator={tweaks.indicator}
          showNat={tweaks.showNat}
          showScore={tweaks.showScore}
          paperMode={tweaks.paperMode}
          perRow={tweaks.perRow}
        />
      )}
      {viz === "era" && <EraStreamgraph division={tweaks.division} />}
      {viz === "career" && <CareerSlamGrid division={tweaks.division} />}
      {viz === "fingerprint" && <ScoreFingerprint tournamentKey={tweaks.tournament} division={tweaks.division} />}
      {viz === "nations" && <NationStream division={tweaks.division} />}
    </div>
  );
}
