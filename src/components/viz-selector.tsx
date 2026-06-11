"use client";

import type { VizTab } from "@/lib/types";

const TABS: { value: VizTab; label: string }[] = [
  { value: "poster", label: "Poster" },
  { value: "gallery", label: "The Series" },
  { value: "era", label: "Era Dominance" },
  { value: "career", label: "Career Slams" },
  { value: "fingerprint", label: "Fingerprints" },
  { value: "nations", label: "Nations" },
];

interface Props {
  active: VizTab;
  onChange: (tab: VizTab) => void;
}

export function VizSelector({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 px-1 py-1 bg-white/5 rounded-lg">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          aria-pressed={active === tab.value}
          className={`interactive-lift px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide transition-colors ${
            active === tab.value ? "accent-active" : "text-white/50 hover:text-white/70 hover:bg-white/5"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
