/**
 * Export a COLLECTION viz.json for the champions-grid POSTER prints, for the
 * prodigi listing-video renderer's poster-reveal template.
 *   Run:  npx tsx scripts/export-poster-viz.ts
 *
 * One file, an array of items — each item is a full viz doc for one
 * tournament × division × aspect, selected at render time by `key`
 * (e.g. "wb-men-a"). Geometry is computed with the SAME formula the poster
 * component uses (src/components/poster/poster.tsx) so the video reveals register
 * pixel-perfectly with the printed badges, tramlines and header.
 *
 * IMPORTANT: every expression in buildPosterDoc is copied verbatim from
 * poster.tsx's render body so the two cannot drift. If poster.tsx changes, change
 * it here.
 */
import fs from "node:fs";
import path from "node:path";
import { TENNIS_DATA } from "../src/lib/data";
import { TOURNAMENTS, DIVISIONS } from "../src/lib/tournaments";
import type { Division, TournamentKey } from "../src/lib/types";

const round = (n: number) => Math.round(n * 1000) / 1000;

function buildPosterDoc(tournament: TournamentKey, division: Division, perRow: number, aspect: "a" | "18x24") {
  const data = TENNIS_DATA[tournament][division];
  const tourn = TOURNAMENTS[tournament];

  // --- verbatim from poster.tsx ---
  const W = 1188;
  const H = aspect === "18x24" ? 1584 : 1684;
  const FOOT_H = 230;
  const PAD_X = 70;
  const PAD_TOP = 70;
  const FRAME = 28;
  const footerTop = H - FRAME - FOOT_H;
  const fieldBottom = footerTop - FRAME;

  const cols = perRow;
  const totalRows = Math.ceil(data.length / cols);
  const gridW = W - PAD_X * 2 - 60;
  const yearStripW = 60;
  const cellW = gridW / cols;
  const gridTop = PAD_TOP;
  const gridBottom = fieldBottom - 34;
  const gridH = gridBottom - gridTop;
  const cellH = Math.min(gridH / totalRows, cellW * 1.05);
  const radius = Math.min(cellW, cellH) * 0.38;
  // header text baseline is 58; left run starts at PAD_X + yearStripW.
  // footer title: centred at (W/2, footerTop+118), forced to textLength = 1000.
  const TITLE_W = 1000;
  const footerTitleText = `${tourn.name.toUpperCase()} CHAMPIONS`;
  const titleBaseline = footerTop + 118;
  // --------------------------------

  const cells = data.map((_row, i) => ({
    cx: round(PAD_X + yearStripW + cellW * ((i % cols) + 0.5)),
    cy: round(gridTop + cellH * (Math.floor(i / cols) + 0.5)),
    r: round(radius),
  }));

  return {
    schemaVersion: 1 as const,
    family: "poster" as const,
    key: `${tournament.toLowerCase()}-${division}-${aspect}`,
    designName: `${tourn.name} Champions — ${DIVISIONS[division].label} (${aspect === "a" ? "A-series" : "18×24"})`,
    space: { width: W, height: H },
    placement: { x: 0, y: 0, width: 1, height: 1 },
    styling: { background: tourn.bg, palette: [tourn.bgDeep, tourn.ball, tourn.accent], fontFamily: "Montserrat" },
    regions: { footer: { x: 0, y: footerTop / H, width: 1, height: FOOT_H / H } },
    cells,
    cellOverscan: 1.06,
    // Court-frame: the white margin (width FRAME) wraps the colour field; trace
    // its centreline so the printed tramline reveals cleanly all the way round.
    frame: { x: round(FRAME / 2), y: round(FRAME / 2), width: round(W - FRAME), height: round(fieldBottom), strokeWidth: FRAME },
    // Top header strip ("OPEN ERA · … · CHAMPIONS & FINAL SCORES" + legend).
    header: { x: PAD_X + yearStripW, y: 44, width: W - PAD_X * 2 - yearStripW, height: 22 },
    // Footer title box (typed char-by-char). steps = character count of the title.
    footerTitle: { x: (W - TITLE_W) / 2, y: Math.round(titleBaseline - 78), width: TITLE_W, height: 100, steps: footerTitleText.length },
  };
}

function main(): void {
  const outDir = path.join(process.cwd(), "out");
  fs.mkdirSync(outDir, { recursive: true });

  const tournaments: TournamentKey[] = ["AO", "RG", "WB", "US"];
  const divisions: Division[] = ["men", "women"];
  const aspects: Array<"a" | "18x24"> = ["a", "18x24"];

  const items = [];
  for (const t of tournaments) for (const div of divisions) for (const aspect of aspects) {
    items.push(buildPosterDoc(t, div, 6, aspect));
  }

  const collection = { schemaVersion: 1 as const, kind: "collection" as const, collectionName: "Tennis Majors — champions grids", items };
  const file = path.join(outDir, "tennis-posters.viz.json");
  fs.writeFileSync(file, JSON.stringify(collection));
  console.log(`wrote ${file} — ${items.length} items`);
  for (const it of items) console.log(`  ${it.key}: ${it.cells.length} circles, r=${it.cells[0]?.r}, lastCy=${it.cells[it.cells.length - 1]?.cy}, bg=${it.styling.background}`);
}

main();
