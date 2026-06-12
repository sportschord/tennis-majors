"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ArtboardProps {
  /** Logical artwork dimensions (viewBox units = px at 100%). */
  width: number;
  height: number;
  /** Re-keys the fade-in when the artwork changes. */
  artworkKey: string;
  children: React.ReactNode;
}

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const FIT_PADDING = 48;

/**
 * Print-proof artboard: frames the artwork like paper on a dark matte and
 * provides fit / 100% / +/- zoom. Children render inside a width-driven box,
 * so the SVG (width:100%) scales without touching the export serialization.
 */
export function Artboard({ width, height, artworkKey, children }: ArtboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  // null = fit-to-viewport; number = explicit zoom (1 = 100%, actual pixels)
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure synchronously on mount: ResizeObserver callbacks ride on
    // rendering frames, which throttled/headless tabs may not produce —
    // without this the artboard stays blank until the first real frame.
    setViewport({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(([entry]) => {
      setViewport({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitScale =
    viewport.w > 0 && viewport.h > 0
      ? Math.min((viewport.w - FIT_PADDING) / width, (viewport.h - FIT_PADDING) / height, 1)
      : 0;

  const effectiveZoom = zoom ?? fitScale;
  const renderedWidth = width * effectiveZoom;

  const zoomBy = useCallback(
    (factor: number) => {
      setZoom((prev) => {
        const current = prev ?? fitScale;
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * factor));
      });
    },
    [fitScale]
  );

  return (
    <div ref={containerRef} className="relative flex-1 min-h-0 overflow-auto">
      {renderedWidth > 0 && (
        <div className="min-w-full min-h-full flex items-start justify-center p-6">
          <div
            key={artworkKey}
            className="fade-slide-in flex-shrink-0"
            style={{
              width: renderedWidth,
              boxShadow: "0 1px 2px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.5)",
              outline: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {children}
          </div>
        </div>
      )}

      <div className="artboard-toolbar glass-panel fixed bottom-12 right-5 z-40 flex items-center gap-0.5 rounded-full px-1.5 py-1">
        <button
          onClick={() => zoomBy(1 / ZOOM_STEP)}
          aria-label="Zoom out"
          className="interactive-lift w-7 h-7 rounded-full text-white/60 hover:text-white hover:bg-white/10 text-sm leading-none"
        >
          −
        </button>
        <button
          onClick={() => setZoom(null)}
          aria-label="Fit to viewport"
          className={`interactive-lift px-2 h-7 rounded-full text-[10px] font-semibold tracking-wide ${
            zoom === null ? "accent-active" : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          FIT
        </button>
        <button
          onClick={() => setZoom(1)}
          aria-label="Actual size"
          className={`interactive-lift px-2 h-7 rounded-full text-[10px] font-semibold tracking-wide ${
            zoom === 1 ? "accent-active" : "text-white/60 hover:text-white hover:bg-white/10"
          }`}
        >
          100%
        </button>
        <button
          onClick={() => zoomBy(ZOOM_STEP)}
          aria-label="Zoom in"
          className="interactive-lift w-7 h-7 rounded-full text-white/60 hover:text-white hover:bg-white/10 text-sm leading-none"
        >
          +
        </button>
        <span className="px-1.5 text-[10px] font-medium text-white/40 tabular-nums w-11 text-center">
          {effectiveZoom > 0 ? `${Math.round(effectiveZoom * 100)}%` : ""}
        </span>
      </div>
    </div>
  );
}
