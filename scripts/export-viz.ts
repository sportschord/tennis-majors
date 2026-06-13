/**
 * Export viz.json for the Era Dominance streamgraph prints, for the prodigi
 * listing-video renderer. Run:  npx tsx scripts/export-viz.ts
 *
 * Faithfully replicates the layout in
 *   src/components/visualizations/era-streamgraph.tsx (useMemo, lines ~25-95):
 * triangular-kernel smoothing -> centred stack -> d3 scales. Coordinates are
 * emitted in the SVG viz-space (1600x900); the print is a full-viewBox capture
 * so placement is the whole print. If the renderer's --debug-geometry shows the
 * masks offset from the print, this layout has drifted from the component — keep
 * the two in sync.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { scaleLinear } from "d3-scale";
import { TENNIS_DATA } from "../src/lib/data";
import type { Division } from "../src/lib/types";

const PALETTE = ["#1F6B4A", "#C75B2A", "#1E78B4", "#5D2A6E", "#71A93C", "#D4DD3A", "#9D4321", "#2A4F7A", "#7FC4C0", "#1A6B68"];
const KERNEL = [1, 2, 3, 2, 1];
const W = 1600;
const H = 900;
const PAD = { l: 60, r: 60, t: 132, b: 122 };

function buildDivision(division: Division) {
  const all: { year: number; w: string }[] = [];
  (["AO", "RG", "WB", "US"] as const).forEach((k) => {
    TENNIS_DATA[k][division].forEach((row) => all.push({ year: row.year, w: row.w }));
  });

  const yearMin = 1968;
  const yearMax = Math.max(...all.map((r) => r.year));
  const yrs: number[] = [];
  for (let y = yearMin; y <= yearMax; y++) yrs.push(y);

  const totals: Record<string, number> = {};
  all.forEach((r) => (totals[r.w] = (totals[r.w] || 0) + 1));
  const top = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([n]) => n);

  const ser = top.map((p, i) => {
    const raw = yrs.map((y) => all.filter((r) => r.year === y && r.w === p).length);
    const smooth = raw.map((_, idx) => {
      let s = 0;
      let wsum = 0;
      for (let k = -2; k <= 2; k++) {
        const j = idx + k;
        if (j < 0 || j >= raw.length) continue;
        s += raw[j] * KERNEL[k + 2];
        wsum += KERNEL[k + 2];
      }
      return s / wsum;
    });
    return { name: p, color: PALETTE[i % PALETTE.length], values: smooth, total: totals[p] };
  });

  const stk = yrs.map((_, idx) => {
    const total = ser.reduce((s, sr) => s + sr.values[idx], 0);
    let base = -total / 2;
    return ser.map((sr) => {
      const y0 = base;
      base += sr.values[idx];
      return { y0, y1: base };
    });
  });

  const allY = stk.flat().flatMap((l) => [l.y0, l.y1]);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const xScale = scaleLinear().domain([0, yrs.length - 1]).range([PAD.l, PAD.l + innerW]);
  const yScale = scaleLinear().domain([yMin, yMax]).range([PAD.t + innerH, PAD.t]);

  const x = yrs.map((_, i) => xScale(i));
  const series = ser.map((sr, sIdx) => ({
    id: sr.name,
    label: sr.name,
    color: sr.color,
    y0: yrs.map((_, i) => yScale(stk[i][sIdx].y0)),
    y1: yrs.map((_, i) => yScale(stk[i][sIdx].y1)),
  }));

  return {
    schemaVersion: 1 as const,
    family: "streamgraph" as const,
    designName: `Era Dominance — ${division === "men" ? "Men's" : "Women's"}`,
    space: { width: W, height: H },
    placement: { x: 0, y: 0, width: 1, height: 1 },
    styling: { background: "#FBFAF6", palette: PALETTE, fontFamily: "Montserrat" },
    regions: {
      title: { x: 0, y: 0, width: 1, height: PAD.t / H },
      footer: { x: 0, y: (H - PAD.b) / H, width: 1, height: PAD.b / H },
    },
    x,
    series,
    curve: "basis" as const,
  };
}

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "out");
  await fs.mkdir(outDir, { recursive: true });
  for (const division of ["men", "women"] as Division[]) {
    const viz = buildDivision(division);
    const file = path.join(outDir, `era-${division}.viz.json`);
    await fs.writeFile(file, JSON.stringify(viz, null, 2));
    console.log(`wrote ${file} (${viz.series.length} streams, ${viz.x.length} years)`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
