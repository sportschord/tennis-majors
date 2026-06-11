"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXPORT_PRESETS, exportSvgElement, type ExportPreset } from "@/lib/export-svg";

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>;
  filename?: string;
}

type Feedback = { kind: "ok" | "error"; message: string } | null;

export function ExportButton({ svgRef, filename = "tennis-print" }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), feedback.kind === "ok" ? 2500 : 6000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleExport = useCallback(
    async (preset: ExportPreset) => {
      const svg = svgRef.current;
      if (!svg || busy) return;
      setOpen(false);
      setBusy(true);
      try {
        const saved = await exportSvgElement(svg, filename, preset);
        setFeedback({ kind: "ok", message: `Saved ${saved}` });
      } catch (err) {
        setFeedback({ kind: "error", message: err instanceof Error ? err.message : "Export failed" });
      } finally {
        setBusy(false);
      }
    },
    [svgRef, filename, busy]
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="interactive-lift flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-colors accent-active hover:brightness-110 disabled:opacity-60"
      >
        {busy ? (
          <>
            <span className="inline-block w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Exporting…
          </>
        ) : (
          <>
            Export
            <svg width="8" height="5" viewBox="0 0 10 6" fill="none" aria-hidden="true">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div role="menu" className="glass-panel absolute right-0 top-full mt-2 w-60 rounded-lg p-1.5 z-50">
          {EXPORT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              role="menuitem"
              onClick={() => handleExport(preset)}
              className="interactive-lift w-full text-left px-2.5 py-2 rounded-md hover:bg-white/10"
            >
              <div className="text-[11px] font-semibold text-white">{preset.label}</div>
              <div className="text-[10px] text-white/50">{preset.description}</div>
            </button>
          ))}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className={`glass-panel absolute right-0 top-full mt-2 px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap z-50 ${
            feedback.kind === "ok" ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
