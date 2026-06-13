"use client";

import { useEffect, useState } from "react";
import type { TweakState, VizTab } from "@/lib/types";
import { decodeState } from "@/lib/url-state";
import { Poster } from "@/components/poster/poster";
import { EraStreamgraph } from "@/components/visualizations/era-streamgraph";
import { CareerSlamGrid } from "@/components/visualizations/career-slam-grid";
import { ScoreFingerprint } from "@/components/visualizations/score-fingerprint";
import { NationStream } from "@/components/visualizations/nation-stream";
import { VIZ_DIMS } from "@/lib/viz-dims";

/**
 * Chrome-free render target for headless capture (mirrors f1app's
 * renderOnPage contract): /print?viz=poster&tourn=WB&div=women&...
 * Puppeteer waits for #print-page[data-ready="true"] — set only after
 * fonts have loaded — then screenshots the element at deviceScaleFactor
 * sized for the requested DPI.
 */
export default function PrintPage() {
  const [state, setState] = useState<{
    tweaks: TweakState;
    viz: Exclude<VizTab, "gallery">;
    width: number | null;
    size18: boolean;
  } | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    const { tweaks, viz } = decodeState(window.location.search);
    const params = new URLSearchParams(window.location.search);
    // Optional ?w= overrides the render width in CSS px — used by the PDF
    // path to lay the artwork out at exact page size (594mm ≈ 2245px).
    const wRaw = parseInt(params.get("w") ?? "", 10);
    const width = Number.isFinite(wRaw) ? Math.min(Math.max(wRaw, 100), 8000) : null;
    // ?size=18x24 lays the poster out natively at 3:4 for the US-size master.
    const size18 = params.get("size") === "18x24";
    // The gallery is a browsing view, not a print artifact.
    setState({ tweaks, viz: viz === "gallery" ? "poster" : viz, width, size18 });
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  const { tweaks, viz, width, size18 } = state;
  const base = viz === "poster" && size18 ? { w: 1188, h: 1584 } : VIZ_DIMS[viz];
  const dims = width ? { w: width, h: Math.round((width * base.h) / base.w) } : base;

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
          ballPlacement={tweaks.ballPlacement}
          aspect={size18 ? "18x24" : "a"}
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
