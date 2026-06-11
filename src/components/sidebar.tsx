"use client";

import type { TweakState, TournamentKey, Division } from "@/lib/types";
import { TOURNAMENTS } from "@/lib/tournaments";

interface SidebarProps {
  tweaks: TweakState;
  onTweak: <K extends keyof TweakState>(key: K, value: TweakState[K]) => void;
  open: boolean;
  onClose: () => void;
}

const TOURN_OPTIONS: { value: TournamentKey; label: string; color: string }[] = [
  { value: "AO", label: "Australian Open", color: TOURNAMENTS.AO.bg },
  { value: "RG", label: "French Open", color: TOURNAMENTS.RG.bg },
  { value: "WB", label: "Wimbledon", color: TOURNAMENTS.WB.bg },
  { value: "US", label: "US Open", color: TOURNAMENTS.US.bg },
];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold tracking-[0.06em] uppercase text-white/40 mb-2">{label}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-medium text-white/60 mb-1">{children}</div>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-white/60">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className="relative w-8 h-[18px] rounded-full transition-colors"
        style={{ background: value ? "var(--accent)" : "rgba(255,255,255,0.15)" }}
      >
        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${value ? "translate-x-[14px]" : ""}`} />
      </button>
    </div>
  );
}

export function Sidebar({ tweaks, onTweak, open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] bg-[#0E1A2B]/95 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-xs font-semibold tracking-[0.06em] text-white/80 uppercase">Tweaks</span>
          <button onClick={onClose} aria-label="Close tweaks panel" className="lg:hidden text-white/50 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Section label="Active Print">
            <div>
              <Label>Tournament</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {TOURN_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => onTweak("tournament", t.value)}
                    aria-pressed={tweaks.tournament === t.value}
                    className={`interactive-lift flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-medium transition-colors ${
                      tweaks.tournament === t.value ? "accent-active" : "text-white/50 hover:bg-white/5 hover:text-white/70"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    {t.label.replace("Australian Open", "Aus Open")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Division</Label>
              <div className="flex gap-1">
                {(["men", "women"] as Division[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => onTweak("division", d)}
                    aria-pressed={tweaks.division === d}
                    className={`interactive-lift flex-1 py-1.5 rounded text-[11px] font-medium transition-colors ${
                      tweaks.division === d ? "accent-active" : "text-white/50 hover:bg-white/5"
                    }`}
                  >
                    {d === "men" ? "Men's" : "Women's"}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section label="Print Treatment">
            <div>
              <Label>Background</Label>
              <div className="flex gap-1">
                {(["block", "paper"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => onTweak("paperMode", m)}
                    aria-pressed={tweaks.paperMode === m}
                    className={`interactive-lift flex-1 py-1.5 rounded text-[11px] font-medium capitalize transition-colors ${
                      tweaks.paperMode === m ? "accent-active" : "text-white/50 hover:bg-white/5"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Repeat indicator</Label>
              <select
                value={tweaks.indicator}
                onChange={(e) => onTweak("indicator", e.target.value as TweakState["indicator"])}
                aria-label="Repeat indicator style"
                className="tweak-select w-full h-7 px-2 rounded bg-white/10 border border-white/10 text-[11px] text-white/80 outline-none transition-colors"
              >
                <option value="curl">Ball curl</option>
                <option value="badge">×N badge</option>
                <option value="ring">Inner dot ring</option>
                <option value="none">None — clean</option>
              </select>
            </div>
            <div>
              <Label>Layout</Label>
              <select
                value={String(tweaks.perRow)}
                onChange={(e) => onTweak("perRow", parseInt(e.target.value, 10) as TweakState["perRow"])}
                aria-label="Grid layout"
                className="tweak-select w-full h-7 px-2 rounded bg-white/10 border border-white/10 text-[11px] text-white/80 outline-none transition-colors"
              >
                <option value="6">6 per row (decade)</option>
                <option value="10">10 per row (era band)</option>
                <option value="4">4 per row (taller)</option>
              </select>
            </div>
          </Section>

          <Section label="Show / Hide">
            <Toggle label="Nationality" value={tweaks.showNat} onChange={(v) => onTweak("showNat", v)} />
            <Toggle label="Set scores" value={tweaks.showScore} onChange={(v) => onTweak("showScore", v)} />
          </Section>
        </div>
      </aside>
    </>
  );
}
