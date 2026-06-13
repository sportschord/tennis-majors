"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TweakState, TournamentKey, Division } from "@/lib/types";
import { TOURNAMENT_ORDER } from "@/lib/tournaments";
import { EXPORT_PRESETS, exportSvgElement, type ExportPreset } from "@/lib/export-svg";
import { encodeState } from "@/lib/url-state";
import { UploadProgressModal, type BatchItem, type BatchDestination, type IntakeStatus } from "./upload-progress-modal";

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>;
  filename: string;
  tweaks: TweakState;
  viz: string;
}

type Feedback = { kind: "ok" | "error"; message: string } | null;

const DIVISIONS_ORDER: Division[] = ["men", "women"];

function MenuHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-2 pb-1 text-[9px] font-bold tracking-[0.18em] text-white/35 uppercase">{children}</div>
  );
}

/**
 * Unified Export menu: in-browser SVG exports, server (Puppeteer) renders,
 * and the batch series-to-Drive pipeline.
 */
export function PrintControls({ svgRef, filename, tweaks, viz }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // batch modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [destination, setDestination] = useState<BatchDestination | null>(null);
  const [intakes, setIntakes] = useState<IntakeStatus[]>([]);
  const [batchError, setBatchError] = useState<string | null>(null);

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
    const t = setTimeout(() => setFeedback(null), feedback.kind === "ok" ? 2500 : 7000);
    return () => clearTimeout(t);
  }, [feedback]);

  const clientExport = useCallback(
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

  const serverExport = useCallback(
    async (size: "A" | "18x24") => {
      if (busy) return;
      setOpen(false);
      setBusy(true);
      try {
        const params = encodeState(tweaks, viz === "gallery" ? "poster" : (viz as never));
        const res = await fetch(`/api/generate-print?${params}&format=png&dpi=300&size=${size}`);
        if (res.status === 401) {
          throw new Error("Unauthorized — open /api/print-auth?token=… once in this browser.");
        }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `Server render failed (${res.status})`);
        }
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `${filename}-${size}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        setFeedback({ kind: "ok", message: `Saved ${a.download}` });
      } catch (err) {
        setFeedback({ kind: "error", message: err instanceof Error ? err.message : "Server render failed" });
      } finally {
        setBusy(false);
      }
    },
    [busy, tweaks, viz, filename]
  );

  const exportSeries = useCallback(async () => {
    if (running) return;
    setOpen(false);

    const combos = DIVISIONS_ORDER.flatMap((division) =>
      TOURNAMENT_ORDER.map((tournament) => ({ tournament, division }))
    );
    const sizes: ("A" | "18x24")[] = ["A", "18x24"];

    setItems(
      combos.flatMap((c) =>
        sizes.map((s) => ({
          key: `${c.tournament}-${c.division}-${s}`,
          fileName: `${c.tournament} · ${c.division} · ${s}.png`,
          status: "pending" as const,
        }))
      )
    );
    setLogs([]);
    setDestination(null);
    setIntakes([]);
    setBatchError(null);
    setModalOpen(true);
    setRunning(true);

    // Every tweak except the per-combo tournament/division — forgetting one
    // here silently exports with its default (the ballPlacement bug).
    const settings = {
      indicator: tweaks.indicator,
      ballPlacement: tweaks.ballPlacement,
      perRow: tweaks.perRow,
      showNat: tweaks.showNat,
      showScore: tweaks.showScore,
      paperMode: tweaks.paperMode,
    };

    // Two 4-combination chunks per f1app's Vercel-safe batch sizing.
    const chunks: { tournament: TournamentKey; division: Division }[][] = [combos.slice(0, 4), combos.slice(4, 8)];

    try {
      for (const chunk of chunks) {
        const res = await fetch("/api/generate-print/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            combinations: chunk.map((c) => ({ ...c, clientKey: `${c.tournament}-${c.division}` })),
            settings,
            sizes,
          }),
        });
        if (res.status === 401) {
          throw new Error("Unauthorized — open /api/print-auth?token=… once in this browser.");
        }
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `Batch request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let event: Record<string, unknown>;
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }
            if (event.type === "item") {
              setItems((prev) =>
                prev.map((item) =>
                  item.key === event.key
                    ? {
                        ...item,
                        fileName: (event.fileName as string) || item.fileName,
                        status: event.status as BatchItem["status"],
                        overwritten: Boolean(event.overwritten),
                        driveLink: (event.driveLink as string) ?? item.driveLink,
                        error: (event.error as string) ?? undefined,
                      }
                    : item
                )
              );
            } else if (event.type === "log") {
              setLogs((prev) => [...prev, String(event.message)]);
            } else if (event.type === "intake") {
              const next: IntakeStatus = {
                status: event.status as IntakeStatus["status"],
                message: String(event.message),
              };
              // One row per chunk: "active" replaces the previous row for the
              // running chunk; settled states append-or-replace it.
              setIntakes((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.status === "active") return [...prev.slice(0, -1), next];
                return [...prev, next];
              });
            } else if (event.type === "complete" && event.drive) {
              const drive = event.drive as Record<string, unknown>;
              setDestination({
                folderLink: String(drive.folderLink),
                folderPath: (drive.folderPath as string[]) || [],
                folderId: String(drive.folderId),
              });
            } else if (event.type === "error") {
              setBatchError(String(event.error));
            }
          }
        }
      }
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Batch export failed");
    } finally {
      setRunning(false);
    }
  }, [running, tweaks]);

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
        <div role="menu" className="glass-panel absolute right-0 top-full mt-2 w-64 rounded-lg p-1.5 z-50">
          <MenuHeading>In browser</MenuHeading>
          {EXPORT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              role="menuitem"
              onClick={() => clientExport(preset)}
              className="interactive-lift w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/10"
            >
              <div className="text-[11px] font-semibold text-white">{preset.label}</div>
              <div className="text-[10px] text-white/50">{preset.description}</div>
            </button>
          ))}

          <MenuHeading>Server render</MenuHeading>
          <button
            role="menuitem"
            onClick={() => serverExport("A")}
            className="interactive-lift w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/10"
          >
            <div className="text-[11px] font-semibold text-white">PNG · A size (300 DPI)</div>
            <div className="text-[10px] text-white/50">ISO A-series ratio · 7128×10104 — Prodigi-ready</div>
          </button>
          <button
            role="menuitem"
            onClick={() => serverExport("18x24")}
            className="interactive-lift w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/10"
          >
            <div className="text-[11px] font-semibold text-white">PNG · 18×24 (300 DPI)</div>
            <div className="text-[10px] text-white/50">3:4 ratio · 5400×7200 — Prodigi-ready</div>
          </button>

          <MenuHeading>Pipeline</MenuHeading>
          <button
            role="menuitem"
            onClick={exportSeries}
            className="interactive-lift w-full text-left px-2.5 py-1.5 rounded-md hover:bg-white/10"
          >
            <div className="text-[11px] font-semibold text-white">Export series to Drive</div>
            <div className="text-[10px] text-white/50">All 8 posters · A.png + 18×24.png → prodigi intake</div>
          </button>
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

      <UploadProgressModal
        open={modalOpen}
        running={running}
        items={items}
        logs={logs}
        destination={destination}
        intakes={intakes}
        error={batchError}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
